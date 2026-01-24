import Ledger from '@daml/ledger';
import { NetworkConfig } from '../types';

export class CantonLedgerClient {
    private ledger: Ledger | null = null;
    private token: string | null = null;

    constructor(private network: NetworkConfig) { }

    /**
     * Connect to the Ledger (Initialize the Ledger client)
     * For the JSON API, this primarily means setting up the context with a token.
     * In a real non-custodial wallet, we might not use the standard JSON API directly
     * in this way, or we would sign commands locally.
     * For this MVP, we simulate the connection.
     */
    connect(token: string): void {
        this.token = token;
        // @daml/ledger uses the http-json-api
        this.ledger = new Ledger({
            token: token,
            httpBaseUrl: this.network.jsonApiUrl || 'http://localhost:7575',
        });
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.ledger !== null;
    }

    /**
     * Fetch active contracts for a template
     */
    async fetchActiveContracts<T = unknown, K = string, I = string>(
        templateId: string
    ): Promise<unknown[]> {
        if (!this.ledger) {
            throw new Error('Ledger client not connected');
        }

        // @daml/ledger provides distinct methods/hooks usually used in React context,
        // but the class instance can be used directly for simple fetch.
        // Note: The specific API of @daml/ledger might require using the stream or query methods.
        // We will use a generic query here.

        // Since we are not importing specific template types, we pass the templateId string.
        // Use 'any' to bypass strict ContractId typing for this generic client.
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const template = { templateId } as any;

        const contracts = await this.ledger.query(template);
        return contracts;
    }

    /**
     * Submit a command (Create or Exercise)
     * Currently wraps the @daml/ledger create/exercise functionality.
     * In a full implementation, this would involve local signing of the command payload.
     */
    async submitCommand(command: any): Promise<any> {
        if (!this.ledger) {
            throw new Error('Ledger client not connected');
        }

        // TODO: Implement proper command parsing and submission
        // For Create command
        if (command.type === 'create') {
            return await this.ledger.create(command.templateId, command.payload);
        }

        // For Exercise command
        if (command.type === 'exercise') {
            return await this.ledger.exercise(command.templateId, command.contractId, command.choice, command.argument);
        }

        throw new Error(`Unsupported command type: ${command.type}`);
    }
}
