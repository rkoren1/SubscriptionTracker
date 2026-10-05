namespace SubscriptionTracker.Api.Models;

public class Subscription
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = "General";
    public decimal Price { get; set; }
    public string Currency { get; set; } = "USD";
    public BillingCycle BillingCycle { get; set; }
    public DateOnly NextBillingDate { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public decimal GetAnnualTotal()
    {
        return BillingCycle switch
        {
            BillingCycle.Weekly => Price * 52m,
            BillingCycle.Monthly => Price * 12m,
            BillingCycle.Quarterly => Price * 4m,
            BillingCycle.Yearly => Price,
            _ => Price
        };
    }
}
