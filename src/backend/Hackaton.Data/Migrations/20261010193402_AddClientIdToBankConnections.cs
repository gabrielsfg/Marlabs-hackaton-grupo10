using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Hackaton.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddClientIdToBankConnections : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ClientId",
                table: "BankConnections",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_BankConnections_ClientId",
                table: "BankConnections",
                column: "ClientId");

            migrationBuilder.AddForeignKey(
                name: "FK_BankConnections_Clients_ClientId",
                table: "BankConnections",
                column: "ClientId",
                principalTable: "Clients",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_BankConnections_Clients_ClientId",
                table: "BankConnections");

            migrationBuilder.DropIndex(
                name: "IX_BankConnections_ClientId",
                table: "BankConnections");

            migrationBuilder.DropColumn(
                name: "ClientId",
                table: "BankConnections");
        }
    }
}
