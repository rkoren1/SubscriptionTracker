using System.Security.Claims;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SubscriptionTracker.Api.Data;
using SubscriptionTracker.Api.Models;

namespace SubscriptionTracker.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class SubscriptionsController : ControllerBase
{
    private readonly AppDbContext _context;

    public SubscriptionsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Subscription>>> GetSubscriptions()
    {
        var subscriptions = await _context.Subscriptions
            .Where(x => x.UserId == CurrentUserId)
            .OrderBy(x => x.Name)
            .ToListAsync();

        return Ok(subscriptions);
    }

    [HttpPost("import")]
    public async Task<IActionResult> ImportSubscriptions(
        IReadOnlyList<ImportSubscriptionRequest> subscriptions,
        CancellationToken cancellationToken)
    {
        if (subscriptions.Any(x => x.Id == Guid.Empty) ||
            subscriptions.Select(x => x.Id).Distinct().Count() != subscriptions.Count)
        {
            return BadRequest("Subscription IDs must be present and unique.");
        }

        await using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        var ids = subscriptions.Select(x => x.Id).ToArray();
        var existing = await _context.Subscriptions
            .Where(x => ids.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, cancellationToken);

        if (existing.Values.Any(x => x.UserId != CurrentUserId))
        {
            return Conflict("One or more subscription IDs are already in use.");
        }

        var now = DateTime.UtcNow;
        foreach (var request in subscriptions)
        {
            if (existing.TryGetValue(request.Id, out var subscription))
            {
                subscription.Name = request.Name;
                subscription.Category = request.Category;
                subscription.Price = request.Price;
                subscription.Currency = request.Currency;
                subscription.BillingCycle = request.BillingCycle;
                subscription.NextBillingDate = request.NextBillingDate;
                subscription.EndDate = request.EndDate;
                subscription.IsActive = request.IsActive;
                subscription.UpdatedAt = now;
                continue;
            }

            _context.Subscriptions.Add(new Subscription
            {
                Id = request.Id,
                UserId = CurrentUserId,
                Name = request.Name,
                Category = request.Category,
                Price = request.Price,
                Currency = request.Currency,
                BillingCycle = request.BillingCycle,
                NextBillingDate = request.NextBillingDate,
                EndDate = request.EndDate,
                IsActive = request.IsActive,
                CreatedAt = now,
                UpdatedAt = now
            });
        }

        await _context.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return NoContent();
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Subscription>> GetSubscription(Guid id)
    {
        var subscription = await _context.Subscriptions
            .SingleOrDefaultAsync(x => x.Id == id && x.UserId == CurrentUserId);

        if (subscription is null)
        {
            return NotFound();
        }

        return Ok(subscription);
    }

    [HttpPost]
    public async Task<ActionResult<Subscription>> CreateSubscription(Subscription subscription)
    {
        if (string.IsNullOrWhiteSpace(subscription.Name))
        {
            return BadRequest("Subscription name is required.");
        }

        subscription.Id = Guid.NewGuid();
        subscription.UserId = CurrentUserId;
        subscription.CreatedAt = DateTime.UtcNow;
        subscription.UpdatedAt = DateTime.UtcNow;

        _context.Subscriptions.Add(subscription);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetSubscription), new { id = subscription.Id }, subscription);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateSubscription(Guid id, Subscription subscription)
    {
        if (id != subscription.Id)
        {
            return BadRequest();
        }

        var existingSubscription = await _context.Subscriptions
            .SingleOrDefaultAsync(x => x.Id == id && x.UserId == CurrentUserId);
        if (existingSubscription is null)
        {
            return NotFound();
        }

        existingSubscription.Name = subscription.Name;
        existingSubscription.Category = subscription.Category;
        existingSubscription.Price = subscription.Price;
        existingSubscription.Currency = subscription.Currency;
        existingSubscription.BillingCycle = subscription.BillingCycle;
        existingSubscription.NextBillingDate = subscription.NextBillingDate;
        existingSubscription.EndDate = subscription.EndDate;
        existingSubscription.IsActive = subscription.IsActive;
        existingSubscription.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteSubscription(Guid id)
    {
        var subscription = await _context.Subscriptions
            .SingleOrDefaultAsync(x => x.Id == id && x.UserId == CurrentUserId);
        if (subscription is null)
        {
            return NotFound();
        }

        _context.Subscriptions.Remove(subscription);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private Guid CurrentUserId => Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
}

public sealed record ImportSubscriptionRequest
{
    [Required]
    public required Guid Id { get; init; }

    [Required, MaxLength(200)]
    public required string Name { get; init; }

    [MaxLength(100)]
    public string Category { get; init; } = "General";

    [Range(0, 999999999)]
    public required decimal Price { get; init; }

    [Required, MaxLength(10)]
    public required string Currency { get; init; }

    public required BillingCycle BillingCycle { get; init; }
    public required DateOnly NextBillingDate { get; init; }
    public DateOnly? EndDate { get; init; }
    public bool IsActive { get; init; } = true;
}
