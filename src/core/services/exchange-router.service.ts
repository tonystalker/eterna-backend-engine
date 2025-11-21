import { createLogger } from '../infrastructure/logging/system.logger';

const logger = createLogger('EXCHANGE_ROUTER');

interface Exchange {
  name: string;
  price: number;
  liquidity: number;
  fees: number;
  processingTime: number;
}

interface Quote {
  exchange: string;
  price: number;
  liquidity: number;
  fees: number;
  effectivePrice: number;
  savings?: number;
}

export class ExchangeRouter {
  private readonly exchanges = ['Raydium', 'Meteora', 'Orca', 'Jupiter'];

  async getAllQuotes(request: {
    tokenIn: string;
    tokenOut: string;
    amount: number;
  }): Promise<Quote[]> {
    logger.info('Fetching quotes from all exchanges', {
      tokenIn: request.tokenIn,
      tokenOut: request.tokenOut,
      amount: request.amount,
    });

    const quotes: Quote[] = [];

    for (const exchangeName of this.exchanges) {
      try {
        const quote = await this.fetchQuoteFromExchange(exchangeName, request);
        quotes.push(quote);
        
        logger.debug('Quote received from exchange', {
          exchange: exchangeName,
          price: quote.price,
          effectivePrice: quote.effectivePrice,
        });
      } catch (exchangeError) {
        logger.warn('Failed to fetch quote from exchange', {
          exchange: exchangeName,
          error: exchangeError instanceof Error ? exchangeError.message : String(exchangeError),
        });
      }
    }

    quotes.sort((a, b) => b.effectivePrice - a.effectivePrice);

    logger.info('All quotes fetched successfully', {
      totalQuotes: quotes.length,
      bestExchange: quotes[0]?.exchange,
      bestPrice: quotes[0]?.effectivePrice,
    });

    return quotes;
  }

  selectBestQuote(quotes: Quote[]): Quote {
    if (quotes.length === 0) {
      throw new Error('No quotes available for comparison');
    }

    const bestQuote = quotes[0];
    
    if (quotes.length > 1) {
      const secondBest = quotes[1];
      bestQuote.savings = ((bestQuote.effectivePrice - secondBest.effectivePrice) / secondBest.effectivePrice) * 100;
    }

    logger.info('Best quote selected', {
      exchange: bestQuote.exchange,
      price: bestQuote.price,
      effectivePrice: bestQuote.effectivePrice,
      savings: bestQuote.savings,
      alternatives: quotes.length - 1,
    });

    return bestQuote;
  }

  private async fetchQuoteFromExchange(exchangeName: string, _request: {
    tokenIn: string;
    tokenOut: string;
    amount: number;
  }): Promise<Quote> {
    const delay = Math.floor(Math.random() * 300) + 200;
    await new Promise(resolve => setTimeout(resolve, delay));

    const basePrice = 100;
    const variance = (Math.random() - 0.5) * 0.1;
    const price = basePrice * (1 + variance);
    
    const liquidity = Math.floor(Math.random() * 1000000) + 100000;
    const fees = 0.001 + Math.random() * 0.002;
    const effectivePrice = price * (1 - fees);

    logger.debug('Exchange quote generated', {
      exchange: exchangeName,
      basePrice,
      variance,
      finalPrice: price,
      fees,
      effectivePrice,
    });

    return {
      exchange: exchangeName,
      price,
      liquidity,
      fees,
      effectivePrice,
    };
  }

  async getExchangeInfo(): Promise<Exchange[]> {
    logger.info('Fetching exchange information');

    const exchanges: Exchange[] = this.exchanges.map(name => ({
      name,
      price: 100 + (Math.random() - 0.5) * 10,
      liquidity: Math.floor(Math.random() * 1000000) + 100000,
      fees: 0.001 + Math.random() * 0.002,
      processingTime: Math.floor(Math.random() * 2000) + 1000,
    }));

    logger.debug('Exchange information retrieved', {
      totalExchanges: exchanges.length,
      averageLiquidity: exchanges.reduce((sum, ex) => sum + ex.liquidity, 0) / exchanges.length,
    });

    return exchanges;
  }

  async checkExchangeHealth(exchangeName: string): Promise<boolean> {
    logger.debug('Checking exchange health', { exchangeName });

    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const isHealthy = Math.random() > 0.05;
      
      logger.debug('Exchange health check completed', {
        exchangeName,
        isHealthy,
      });

      return isHealthy;
    } catch (healthError) {
      logger.error('Exchange health check failed', {
        exchangeName,
        error: healthError instanceof Error ? healthError.message : String(healthError),
      });
      return false;
    }
  }
}

export const exchangeRouter = new ExchangeRouter();
