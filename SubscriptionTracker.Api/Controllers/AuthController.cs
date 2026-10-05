using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using SubscriptionTracker.Api.Models;

namespace SubscriptionTracker.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    public const string SessionCookieName = "subscription_tracker_session";

    private readonly UserManager<AppUser> _userManager;
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;

    public AuthController(
        UserManager<AppUser> userManager,
        IConfiguration configuration,
        IWebHostEnvironment environment)
    {
        _userManager = userManager;
        _configuration = configuration;
        _environment = environment;
    }

    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.DisplayName))
        {
            return BadRequest(new { message = "Name is required." });
        }

        var email = request.Email.Trim();
        var user = new AppUser
        {
            UserName = email,
            Email = email,
            DisplayName = request.DisplayName.Trim()
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            return BadRequest(new
            {
                message = string.Join(" ", result.Errors.Select(error => error.Description))
            });
        }

        SetSessionCookie(user);
        return Ok(ToResponse(user));
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request)
    {
        var user = await _userManager.FindByEmailAsync(request.Email.Trim());
        if (user is null || await _userManager.IsLockedOutAsync(user))
        {
            return Unauthorized(new { message = "Email or password is incorrect." });
        }

        if (!await _userManager.CheckPasswordAsync(user, request.Password))
        {
            await _userManager.AccessFailedAsync(user);
            return Unauthorized(new { message = "Email or password is incorrect." });
        }

        await _userManager.ResetAccessFailedCountAsync(user);
        SetSessionCookie(user);
        return Ok(ToResponse(user));
    }

    [HttpPost("google")]
    public async Task<ActionResult<AuthResponse>> Google(GoogleLoginRequest request)
    {
        var clientId = _configuration["Authentication:Google:ClientId"];
        if (string.IsNullOrWhiteSpace(clientId))
        {
            return Problem(
                statusCode: StatusCodes.Status503ServiceUnavailable,
                title: "Google sign-in is not configured.");
        }

        GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(
                request.Credential,
                new GoogleJsonWebSignature.ValidationSettings { Audience = new[] { clientId } });
        }
        catch (InvalidJwtException)
        {
            return Unauthorized(new { message = "Google could not verify this sign-in." });
        }

        if (!payload.EmailVerified || string.IsNullOrWhiteSpace(payload.Email))
        {
            return Unauthorized(new { message = "A verified Google email is required." });
        }

        var user = await FindOrCreateGoogleUserAsync(payload);
        if (user is null)
        {
            return Conflict(new { message = "Unable to link this Google account." });
        }

        SetSessionCookie(user);
        return Ok(ToResponse(user));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<AuthResponse>> Me()
    {
        var id = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var user = id is null ? null : await _userManager.FindByIdAsync(id);

        return user is null ? Unauthorized() : Ok(ToResponse(user));
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        Response.Cookies.Delete(SessionCookieName, new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Lax,
            Path = "/"
        });
        return NoContent();
    }

    private async Task<AppUser?> FindOrCreateGoogleUserAsync(GoogleJsonWebSignature.Payload payload)
    {
        var user = await _userManager.FindByLoginAsync("Google", payload.Subject);
        if (user is not null)
        {
            return user;
        }

        var email = payload.Email.Trim();
        user = await _userManager.FindByEmailAsync(email);
        var createdForGoogle = false;
        if (user is null)
        {
            user = new AppUser
            {
                UserName = email,
                Email = email,
                EmailConfirmed = true,
                DisplayName = string.IsNullOrWhiteSpace(payload.Name) ? email : payload.Name
            };

            var createResult = await _userManager.CreateAsync(user);
            if (!createResult.Succeeded)
            {
                return null;
            }

            createdForGoogle = true;
        }

        var loginResult = await _userManager.AddLoginAsync(
            user,
            new UserLoginInfo("Google", payload.Subject, "Google"));
        if (loginResult.Succeeded)
        {
            return user;
        }

        if (createdForGoogle)
        {
            await _userManager.DeleteAsync(user);
        }

        return null;
    }

    private void SetSessionCookie(AppUser user)
    {
        var key = _configuration["Jwt:SigningKey"];
        if (string.IsNullOrWhiteSpace(key) && _environment.IsDevelopment())
        {
            key = "SubscriptionTracker-LOCAL-ONLY-signing-key-change-before-deploy-2026";
        }

        if (string.IsNullOrWhiteSpace(key))
        {
            throw new InvalidOperationException("Jwt:SigningKey must be configured.");
        }
        if (Encoding.UTF8.GetByteCount(key) < 32)
        {
            throw new InvalidOperationException("Jwt:SigningKey must be at least 32 bytes long.");
        }

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.DisplayName),
            new Claim(ClaimTypes.Email, user.Email ?? string.Empty)
        };
        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
            SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: "SubscriptionTracker.Api",
            audience: "SubscriptionTracker.Web",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(8),
            signingCredentials: credentials);

        Response.Cookies.Append(SessionCookieName, new JwtSecurityTokenHandler().WriteToken(token), new CookieOptions
        {
            HttpOnly = true,
            Secure = true,
            SameSite = SameSiteMode.Lax,
            IsEssential = true,
            Path = "/",
            MaxAge = TimeSpan.FromHours(8)
        });
    }

    private static AuthResponse ToResponse(AppUser user) =>
        new(user.Id, user.Email ?? string.Empty, user.DisplayName);
}

public sealed record RegisterRequest
{
    [Required, EmailAddress, MaxLength(256)]
    public required string Email { get; init; }

    [Required, MinLength(8), MaxLength(128)]
    public required string Password { get; init; }

    [Required, MinLength(1), MaxLength(100)]
    public required string DisplayName { get; init; }
}

public sealed record LoginRequest
{
    [Required, EmailAddress, MaxLength(256)]
    public required string Email { get; init; }

    [Required, MaxLength(128)]
    public required string Password { get; init; }
}

public sealed record GoogleLoginRequest
{
    [Required, MaxLength(8192)]
    public required string Credential { get; init; }
}

public sealed record AuthResponse(Guid Id, string Email, string DisplayName);