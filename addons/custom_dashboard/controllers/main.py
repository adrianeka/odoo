from odoo import http
from odoo.http import request


class CustomDashboardController(http.Controller):

    @http.route("/custom_dashboard/data", type="jsonrpc", auth="user")
    def dashboard_data(self):
        data = request.env["custom.dashboard"].sudo().get_dashboard_data()
        return data
