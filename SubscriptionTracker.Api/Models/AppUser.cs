using Microsoft.AspNetCore.Identity;

namespace SubscriptionTracker.Api.Models;

public class AppUser : IdentityUser<Guid>
{
    public string DisplayName { get; set; } = string.Empty;
}