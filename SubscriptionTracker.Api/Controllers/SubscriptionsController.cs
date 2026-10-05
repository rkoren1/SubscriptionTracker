using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SubscriptionTracker.Api.Data;
using SubscriptionTracker.Api.Models;

namespace SubscriptionTracker.Api.Controllers;

[ApiController]
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
            .OrderBy(x => x.Name)
            .ToListAsync();

        return Ok(subscriptions);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<Subscription>> GetSubscription(Guid id)
    {
        var subscription = await _context.Subscriptions.FindAsync(id);

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

        var existingSubscription = await _context.Subscriptions.FindAsync(id);
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
        existingSubscription.IsActive = subscription.IsActive;
        existingSubscription.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteSubscription(Guid id)
    {
        var subscription = await _context.Subscriptions.FindAsync(id);
        if (subscription is null)
        {
            return NotFound();
        }

        _context.Subscriptions.Remove(subscription);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
