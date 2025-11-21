import { createLogger } from '../infrastructure/logging/system.logger';
import { exchangeRouter } from '../services/exchange-router.service';
import { getDatabaseConnection } from '../infrastructure/config/database.config';
import { streamOrchestrator } from '../orchestrators/stream.orchestrator';

const logger = createLogger('MARKET_TRANSACTION_PROCESSOR');

// Transaction status states
enum TransactionStatus {
  PENDING = 'pending',
  ROUTING = 'routing',
  BUILDING = 'building',
  SUBMITTED = 'submitted',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
}

/**
 * Market transaction processor implementation
 */
export class MarketTransactionProcessor {
  private database = getDatabaseConnection();

  /**
   * Process market transaction
   */
  async process(transactionData: any, statusCallback?: (update: any) => void): Promise<any> {
    const processorLogger = logger.withCorrelation(transactionData.transactionId);
    
    try {
      processorLogger.info('Starting market transaction processing', {
        transactionId: transactionData.transactionId,
        tokenIn: transactionData.tokenIn,
        tokenOut: transactionData.tokenOut,
        amount: transactionData.amount,
      });

      // Update status to PENDING
      await this.updateTransactionStatus(
        transactionData.databaseId,
        TransactionStatus.PENDING,
        null,
        statusCallback
      );

      // Step 1: Route to best exchange
      const routingResult = await this.routeToBestExchange(transactionData, statusCallback);
      
      // Step 2: Build transaction
      const buildResult = await this.buildTransaction(transactionData, routingResult.selectedExchange, statusCallback);
      
      // Step 3: Submit transaction
      const submitResult = await this.submitTransaction(transactionData, buildResult, statusCallback);
      
      // Step 4: Confirm transaction
      const confirmResult = await this.confirmTransaction(transactionData, submitResult, statusCallback);

      processorLogger.info('Market transaction processing completed successfully', {
        transactionId: transactionData.transactionId,
        finalStatus: confirmResult.status,
        executedPrice: confirmResult.executedPrice,
      });

      return confirmResult;

    } catch (processingError) {
      processorLogger.error('Market transaction processing failed', {
        transactionId: transactionData.transactionId,
        error: processingError instanceof Error ? processingError.message : String(processingError),
        stack: processingError instanceof Error ? processingError.stack : undefined,
      });

      // Update status to FAILED
      await this.updateTransactionStatus(
        transactionData.databaseId,
        TransactionStatus.FAILED,
        processingError instanceof Error ? processingError.message : String(processingError),
        statusCallback
      );

      throw processingError;
    }
  }

  /**
   * Route transaction to best exchange
   */
  private async routeToBestExchange(transactionData: any, statusCallback?: (update: any) => void) {
    const processorLogger = logger.withCorrelation(transactionData.transactionId);
    
    processorLogger.info('Routing transaction to best exchange');

    // Update status to ROUTING
    await this.updateTransactionStatus(
      transactionData.databaseId,
      TransactionStatus.ROUTING,
      null,
      statusCallback
    );

    // Get quotes from all exchanges
    const quotes = await exchangeRouter.getAllQuotes({
      tokenIn: transactionData.tokenIn,
      tokenOut: transactionData.tokenOut,
      amount: transactionData.amount,
    });

    processorLogger.debug('Exchange quotes received', {
      quoteCount: quotes.length,
      quotes: quotes.map(q => ({ exchange: q.exchange, price: q.price })),
    });

    // Select best exchange
    const selectedQuote = exchangeRouter.selectBestQuote(quotes);
    
    const routingResult = {
      selectedExchange: selectedQuote.exchange,
      selectedPrice: selectedQuote.price,
      allQuotes: quotes,
      routingReason: `Best price: ${selectedQuote.price} (${selectedQuote.exchange})`,
    };

    processorLogger.info('Exchange routing completed', {
      selectedExchange: selectedQuote.exchange,
      selectedPrice: selectedQuote.price,
      savings: selectedQuote.savings || 0,
    });

    // Broadcast routing update
    streamOrchestrator.broadcastTransactionUpdate(transactionData.transactionId, {
      status: TransactionStatus.ROUTING,
      data: routingResult,
    });

    return routingResult;
  }

  /**
   * Build transaction for selected exchange
   */
  private async buildTransaction(transactionData: any, selectedExchange: string, statusCallback?: (update: any) => void) {
    const processorLogger = logger.withCorrelation(transactionData.transactionId);
    
    processorLogger.info('Building transaction for exchange', { selectedExchange });

    // Update status to BUILDING
    await this.updateTransactionStatus(
      transactionData.databaseId,
      TransactionStatus.BUILDING,
      null,
      statusCallback
    );

    // Simulate transaction building (2-3 seconds)
    await this.simulateProcessing(2000, 3000);

    const buildResult = {
      exchange: selectedExchange,
      transactionData: {
        input: transactionData.amount,
        output: transactionData.amount * 0.98, // Simulate 2% slippage
        fees: 0.001,
      },
      buildTime: Date.now(),
    };

    processorLogger.info('Transaction build completed', {
      exchange: selectedExchange,
      estimatedOutput: buildResult.transactionData.output,
    });

    // Broadcast building update
    streamOrchestrator.broadcastTransactionUpdate(transactionData.transactionId, {
      status: TransactionStatus.BUILDING,
      data: buildResult,
    });

    return buildResult;
  }

  /**
   * Submit transaction to exchange
   */
  private async submitTransaction(transactionData: any, buildResult: any, statusCallback?: (update: any) => void) {
    const processorLogger = logger.withCorrelation(transactionData.transactionId);
    
    processorLogger.info('Submitting transaction to exchange', {
      exchange: buildResult.exchange,
    });

    // Update status to SUBMITTED
    await this.updateTransactionStatus(
      transactionData.databaseId,
      TransactionStatus.SUBMITTED,
      null,
      statusCallback
    );

    // Simulate transaction submission (1-2 seconds)
    await this.simulateProcessing(1000, 2000);

    const submitResult = {
      exchange: buildResult.exchange,
      submissionHash: generateTransactionHash(),
      submittedAt: new Date().toISOString(),
      estimatedConfirmation: new Date(Date.now() + 30000).toISOString(), // 30 seconds
    };

    processorLogger.info('Transaction submitted successfully', {
      exchange: buildResult.exchange,
      submissionHash: submitResult.submissionHash,
    });

    // Broadcast submission update
    streamOrchestrator.broadcastTransactionUpdate(transactionData.transactionId, {
      status: TransactionStatus.SUBMITTED,
      data: submitResult,
    });

    return submitResult;
  }

  /**
   * Confirm transaction execution
   */
  private async confirmTransaction(transactionData: any, submitResult: any, _statusCallback?: (update: any) => void): Promise<any> {
    const processorLogger = logger.withCorrelation(transactionData.transactionId);
    
    processorLogger.info('Confirming transaction execution', {
      exchange: submitResult.exchange,
      submissionHash: submitResult.submissionHash,
    });

    // Simulate confirmation (2-4 seconds)
    await this.simulateProcessing(2000, 4000);

    const executedPrice = transactionData.amount * 0.985; // Simulate final execution price
    const confirmResult = {
      status: TransactionStatus.CONFIRMED,
      exchange: submitResult.exchange,
      txHash: submitResult.submissionHash,
      executedPrice,
      inputAmount: transactionData.amount,
      outputAmount: transactionData.amount * 0.985,
      fees: transactionData.amount * 0.015,
      confirmedAt: new Date().toISOString(),
    };

    // Update database with final result
    await this.database.order.update({
      where: { id: transactionData.databaseId },
      data: {
        status: TransactionStatus.CONFIRMED,
        selectedDex: submitResult.exchange,
        executedPrice,
        txHash: submitResult.submissionHash,
      },
    });

    processorLogger.info('Transaction confirmed successfully', {
      transactionId: transactionData.transactionId,
      executedPrice,
      txHash: submitResult.submissionHash,
    });

    // Broadcast confirmation update
    streamOrchestrator.broadcastTransactionUpdate(transactionData.transactionId, confirmResult);

    return confirmResult;
  }

  /**
   * Update transaction status in database
   */
  private async updateTransactionStatus(
    databaseId: string,
    status: string,
    error: string | null,
    statusCallback?: (update: any) => void
  ): Promise<void> {
    try {
      await this.database.order.update({
        where: { id: databaseId },
        data: {
          status,
          error,
          updatedAt: new Date(),
        },
      });

      // Call status callback if provided
      if (statusCallback) {
        statusCallback({ status, error, timestamp: new Date().toISOString() });
      }

    } catch (updateError) {
      logger.error('Failed to update transaction status', {
        databaseId,
        status,
        error: updateError instanceof Error ? updateError.message : String(updateError),
      });
      throw updateError;
    }
  }

  /**
   * Simulate processing delay
   */
  private async simulateProcessing(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

/**
 * Generate mock transaction hash
 */
function generateTransactionHash(): string {
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

// Export singleton instance
export const marketTransactionProcessor = new MarketTransactionProcessor();
