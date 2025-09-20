'use strict';

/**
 * product-stock service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::product-stock.product-stock');
