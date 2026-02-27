{
    "name": "Custom Dashboard",
    "version": "1.0",
    "author": "Custom Development",
    "license": "LGPL-3",
    "depends": ["web", "sale"],
    "data": [
        "views/dashboard_action.xml",
    ],
    "assets": {
        "web.assets_backend": [
            "https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js",
            "custom_dashboard/static/src/js/dashboard.js",
            "custom_dashboard/static/src/xml/dashboard.xml",
            "custom_dashboard/static/src/css/dashboard.css",
        ],
    },
    "installable": True,
    "application": True,
}
