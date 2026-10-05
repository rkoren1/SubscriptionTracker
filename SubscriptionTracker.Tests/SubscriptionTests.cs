namespace SubscriptionTracker.Tests;

using SubscriptionTracker.Api.Models;

public class SubscriptionTests
{
    [Fact]
    public void GetAnnualTotal_MonthlySubscription_ReturnsTwelveTimesPrice()
    {
        var subscription = new Subscription
        {
            Name = "Netflix",
            Price = 15.99m,
            BillingCycle = BillingCycle.Monthly,
            IsActive = true
        };

        var annualTotal = subscription.GetAnnualTotal();

        Assert.Equal(191.88m, annualTotal);
    }
}
