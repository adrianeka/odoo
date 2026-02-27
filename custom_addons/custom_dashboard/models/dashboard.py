from odoo import models, fields
from datetime import datetime, time


class CustomDashboard(models.AbstractModel):
    _name = "custom.dashboard"
    _description = "Custom CRM Dashboard"

    def get_dashboard_data(self, date_from, date_to):
        date_from_dt = datetime.combine(fields.Date.from_string(date_from), time.min)
        date_to_dt = datetime.combine(fields.Date.from_string(date_to), time.max)

        domain = [
            ("create_date", ">=", date_from_dt),
            ("create_date", "<=", date_to_dt),
        ]

        Lead = self.env["crm.lead"]

        leads = Lead.search_count([("type", "=", "lead")] + domain)

        opportunities = Lead.search_count([("type", "=", "opportunity")] + domain)

        won = Lead.search_count(
            [("type", "=", "opportunity"), ("stage_id.is_won", "=", True)] + domain
        )

        lost = Lead.search_count(
            [
                ("type", "=", "opportunity"),
                ("stage_id.is_won", "=", False),
                ("active", "=", False),
            ]
            + domain
        )

        return {
            "leads": leads,
            "opportunities": opportunities,
            "won": won,
            "lost": lost,
        }
