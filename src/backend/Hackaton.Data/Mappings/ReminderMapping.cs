using Hackaton.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Hackaton.Data.Mappings
{
    public class ReminderMapping : IEntityTypeConfiguration<Reminder>
    {
        public void Configure(EntityTypeBuilder<Reminder> builder)
        {
            builder.ToTable("Reminders");

            builder.Property(reminder => reminder.Title).IsRequired().HasMaxLength(300);
            builder.Property(reminder => reminder.DueDate).HasColumnType("date");

            builder.HasIndex(reminder => new { reminder.AdvisorId, reminder.DueDate });
            builder.HasOne<User>()
                .WithMany()
                .HasForeignKey(reminder => reminder.AdvisorId)
                .OnDelete(DeleteBehavior.Restrict);
            builder.HasOne(reminder => reminder.Client)
                .WithMany()
                .HasForeignKey(reminder => reminder.ClientId)
                .OnDelete(DeleteBehavior.SetNull);
        }
    }
}
