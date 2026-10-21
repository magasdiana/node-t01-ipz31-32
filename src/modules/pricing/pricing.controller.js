import { pricingService } from './pricing.service.js';

export const pricingController = {
    // GET /children/:id/invoice
    async getInvoice(req, res, next) {
        try {
            const childId = req.params.id;
            const period = req.query.period || 'month';
            const invoice = await pricingService.getChildInvoice(childId, period);
            res.json(invoice);
        } catch (err) {
            next(err);
        }
    },

    async getPrices(req, res, next) {
        try {
            const prices = await pricingService.getCurrentPrices();
            res.json(prices);
        } catch (err) {
            next(err);
        }
    },

    async updatePrices(req, res, next) {
        try {
            const updated = await pricingService.updatePrices(req.body);
            res.json(updated);
        } catch (err) {
            next(err);
        }
    },

    async getHistory(req, res, next) {
        try {
            const history = await pricingService.getPriceHistory();
            res.json(history);
        } catch (err) {
            next(err);
        }
    }
};