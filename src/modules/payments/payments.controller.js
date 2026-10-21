import { paymentsService } from './payments.service.js';

export const paymentsController = {
    // POST /payments
    async create(req, res, next) {
        try {
            const result = await paymentsService.createPayment(req.body);
            res.status(201).json(result);
        } catch (err) {
            next(err);
        }
    },

    // GET /payments
    async list(req, res, next) {
        try {
            const childId = req.query.childId;
            const results = await paymentsService.getPayments(childId);
            res.json(results);
        } catch (err) {
            next(err);
        }
    }
};