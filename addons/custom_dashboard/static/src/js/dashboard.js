/** @odoo-module */

import { Component, onWillStart, useState } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

export class CustomDashboard extends Component {

    setup() {
        this.orm = useService("orm");
        this.action = useService("action");
        this.charts = {};

        this.state = useState({
            dateFrom: this.getDefaultDateFrom(),
            dateTo: this.getDefaultDateTo(),
            leads: 0,
            opportunities: 0,
            won: 0,
            lost: 0,
            salesSummary: [],
            topCustomers: [],
            cardDetailsVisible: false,
            cardDetailsTitle: '',
            cardDetailsType: '',
            cardDetailsRecords: [],
            cardDetailsLoading: false,
            chartData: {
                trendLabels: [],
                trendData: [],
                stageLabels: [],
                stageData: [],
                winLossLabels: ['Won', 'Lost'],
                winLossData: [],
            },
        });

        onWillStart(async () => {
            await this.reloadAll();
        });
    }

    getDefaultDateFrom = () => {
        const d = new Date();
        d.setDate(1);
        return d.toISOString().slice(0, 10);
    }

    getDefaultDateTo = () => {
        return new Date().toISOString().slice(0, 10);
    }

    getDateDomain = () => {
        return [
            ["create_date", ">=", `${this.state.dateFrom} 00:00:00`],
            ["create_date", "<=", `${this.state.dateTo} 23:59:59`],
        ];
    }

    reloadAll = async () => {
        await Promise.all([
            this.loadCounters(),
            this.loadSalesSummary(),
            this.loadTopCustomers(),
            this.loadChartData(),
        ]);
        this.initCharts();
    }

    loadCounters = async () => {
        const base = this.getDateDomain();

        this.state.leads = await this.orm.searchCount("crm.lead", [
            ["type", "=", "lead"],
            ...base,
        ]);

        this.state.opportunities = await this.orm.searchCount("crm.lead", [
            ["type", "=", "opportunity"],
            ...base,
        ]);

        this.state.won = await this.orm.searchCount("crm.lead", [
            ["type", "=", "opportunity"],
            ["stage_id.is_won", "=", true],
            ...base,
        ]);

        this.state.lost = await this.orm.searchCount("crm.lead", [
            ["type", "=", "opportunity"],
            ["stage_id.is_won", "=", false],
            ["active", "=", false],
            ...base,
        ]);
    }

    loadSalesSummary = async () => {
        const base = this.getDateDomain();

        const ids = await this.orm.search("crm.lead", base, { limit: 2000 });

        if (!ids.length) {
            this.state.salesSummary = [];
            return;
        }

        const records = await this.orm.read(
            "crm.lead",
            ids,
            ["user_id", "type"]
        );

        const map = {};

        for (const r of records) {
            if (!r.user_id) continue;

            const userId = r.user_id[0];
            const userName = r.user_id[1];

            if (!map[userId]) {
                map[userId] = {
                    user_id: userId,
                    user_name: userName,
                    lead: 0,
                    opportunity: 0,
                };
            }

            if (r.type === "lead") {
                map[userId].lead += 1;
            }

            if (r.type === "opportunity") {
                map[userId].opportunity += 1;
            }
        }

        this.state.salesSummary = Object.values(map)
            .sort((a, b) => b.opportunity - a.opportunity);
    }

    loadTopCustomers = async () => {
        const base = [
            ["type", "=", "opportunity"],
            ["partner_id", "!=", false],
            ...this.getDateDomain(),
        ];

        const ids = await this.orm.search("crm.lead", base, { limit: 2000 });

        if (!ids.length) {
            this.state.topCustomers = [];
            return;
        }

        const records = await this.orm.read(
            "crm.lead",
            ids,
            ["partner_id"]
        );

        const map = {};

        for (const r of records) {
            if (!r.partner_id) continue;

            const partnerId = r.partner_id[0];
            const partnerName = r.partner_id[1];

            if (!map[partnerId]) {
                map[partnerId] = {
                    partner_id: partnerId,
                    partner_name: partnerName,
                    total: 0,
                };
            }

            map[partnerId].total += 1;
        }

        this.state.topCustomers = Object.values(map)
            .sort((a, b) => b.total - a.total)
            .slice(0, 8);
    }

    onDateChange = async () => {
        await this.reloadAll();
        if (this.state.cardDetailsVisible && this.state.cardDetailsType) {
            await this.loadCardDetails(this.state.cardDetailsType);
        }
    }

    showCardDetails = async (type, title) => {
        if (this.state.cardDetailsVisible && this.state.cardDetailsType === type) {
            this.state.cardDetailsVisible = false;
            this.state.cardDetailsRecords = [];
            this.state.cardDetailsTitle = '';
            this.state.cardDetailsType = '';
            return;
        }
        this.state.cardDetailsType = type;
        this.state.cardDetailsTitle = title;
        this.state.cardDetailsVisible = true;
        await this.loadCardDetails(type);
    }

    loadCardDetails = async (type) => {
        this.state.cardDetailsLoading = true;
        const base = this.getDateDomain();

        const domain = (type === 'leads') ? [["type", "=", "lead"], ...base]
            : (type === 'opps') ? [["type", "=", "opportunity"], ...base]
            : (type === 'won') ? [["type", "=", "opportunity"], ["stage_id.is_won", "=", true], ...base]
            : (type === 'lost') ? [["type", "=", "opportunity"], ["stage_id.is_won", "=", false], ["active", "=", false], ...base]
            : base;

        const ids = await this.orm.search('crm.lead', domain, { limit: 50, order: 'create_date desc' });
        if (!ids.length) {
            this.state.cardDetailsRecords = [];
            this.state.cardDetailsLoading = false;
            return;
        }

        const records = await this.orm.read('crm.lead', ids, ['name', 'partner_id', 'user_id', 'stage_id', 'create_date']);

        this.state.cardDetailsRecords = records.map(r => ({
            id: r.id,
            name: r.name,
            partner: r.partner_id ? r.partner_id[1] : '',
            user: r.user_id ? r.user_id[1] : '',
            stage: r.stage_id ? r.stage_id[1] : '',
            date: r.create_date ? r.create_date.split(' ')[0] : '',
        }));

        this.state.cardDetailsLoading = false;
    }

    loadChartData = async () => {
        await Promise.all([
            this.loadTrendData(),
            this.loadStageDistribution(),
            this.loadWinLossData(),
        ]);
    }

    loadTrendData = async () => {
        const base = this.getDateDomain();
        const ids = await this.orm.search('crm.lead', [["type", "=", "opportunity"], ...base], { limit: 1000, order: 'create_date' });
        
        if (!ids.length) {
            this.state.chartData.trendLabels = [];
            this.state.chartData.trendData = [];
            return;
        }

        const records = await this.orm.read('crm.lead', ids, ['create_date']);
        const dateCount = {};

        for (const r of records) {
            if (r.create_date) {
                const date = r.create_date.split(' ')[0];
                dateCount[date] = (dateCount[date] || 0) + 1;
            }
        }

        const sortedDates = Object.keys(dateCount).sort();
        let cumulative = 0;
        const cumulativeData = sortedDates.map(date => {
            cumulative += dateCount[date];
            return cumulative;
        });

        this.state.chartData.trendLabels = sortedDates;
        this.state.chartData.trendData = cumulativeData;
    }

    loadStageDistribution = async () => {
        const base = this.getDateDomain();
        const stages = await this.orm.search('crm.stage', []);
        
        if (!stages.length) {
            this.state.chartData.stageLabels = [];
            this.state.chartData.stageData = [];
            return;
        }

        const stageRecords = await this.orm.read('crm.stage', stages, ['name']);
        const labels = [];
        const data = [];

        for (const stage of stageRecords) {
            const count = await this.orm.searchCount('crm.lead', [["stage_id", "=", stage.id], ...base]);
            labels.push(stage.name);
            data.push(count);
        }

        this.state.chartData.stageLabels = labels;
        this.state.chartData.stageData = data;
    }

    loadWinLossData = async () => {
        const base = this.getDateDomain();

        const won = await this.orm.searchCount('crm.lead', [
            ['type', '=', 'opportunity'],
            ['stage_id.is_won', '=', true],
            ...base,
        ]);

        const lost = await this.orm.searchCount('crm.lead', [
            ['type', '=', 'opportunity'],
            ['stage_id.is_won', '=', false],
            ['active', '=', false],
            ...base,
        ]);

        this.state.chartData.winLossData = [won, lost];
    }

    initCharts = () => {
        setTimeout(() => {
            this.renderTrendChart();
            this.renderStageChart();
            this.renderWinLossChart();
        }, 100);
    }

    renderTrendChart = () => {
        const ctx = document.getElementById('trendChart');
        if (!ctx || typeof Chart === 'undefined') return;

        if (this.charts.trend) this.charts.trend.destroy();

        this.charts.trend = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.state.chartData.trendLabels,
                datasets: [{
                    label: 'Opportunities Trend',
                    data: this.state.chartData.trendData,
                    borderColor: '#0066cc',
                    backgroundColor: 'rgba(0, 102, 204, 0.1)',
                    tension: 0.4,
                    fill: true,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { display: true } },
                scales: { y: { beginAtZero: true } },
            },
        });
    }

    renderStageChart = () => {
        const ctx = document.getElementById('stageChart');
        if (!ctx || typeof Chart === 'undefined') return;

        if (this.charts.stage) this.charts.stage.destroy();

        this.charts.stage = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: this.state.chartData.stageLabels,
                datasets: [{
                    label: 'Leads by Stage',
                    data: this.state.chartData.stageData,
                    backgroundColor: ['#0066cc', '#00aa00', '#00cc00', '#ffaa00', '#cc0000'],
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } },
            },
        });
    }

    renderWinLossChart = () => {
        const ctx = document.getElementById('winLossChart');
        if (!ctx || typeof Chart === 'undefined') return;

        if (this.charts.winLoss) this.charts.winLoss.destroy();

        this.charts.winLoss = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: this.state.chartData.winLossLabels,
                datasets: [{
                    data: this.state.chartData.winLossData,
                    backgroundColor: ['#00cc00', '#cc0000'],
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: { legend: { display: true } },
            },
        });
    }

    openAction = (domain, title) => {
        this.action.doAction({
            type: "ir.actions.act_window",
            name: title,
            res_model: "crm.lead",
            views: [[false, "list"], [false, "form"]],
            domain: domain,
        });
    }
}

CustomDashboard.template = "custom_dashboard.Dashboard";
registry.category("actions").add("custom_dashboard.action", CustomDashboard);
