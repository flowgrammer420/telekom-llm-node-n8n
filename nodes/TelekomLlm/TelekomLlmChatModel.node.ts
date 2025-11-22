import type {
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    ILoadOptionsFunctions,
    INodePropertyOptions,
} from 'n8n-workflow';

export class TelekomLlmChatModel implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Telekom LLM',
        name: 'telekomLlmChatModel',
        icon: 'file:telekom.svg',
        group: ['transform'],
        version: 1,
        description: 'T-Systems LLM Hub – OpenAI-compatible Chat Model',
        defaults: { name: 'Telekom LLM' },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [{ name: 'telekomLlmApi', required: true }],
        properties: [
            {
                displayName: 'Model',
                name: 'model',
                type: 'options',
                typeOptions: { loadOptionsMethod: 'getModels' },
                default: 'llama-3.3-70B-Instruct',
                required: true,
            },
            {
                displayName: 'System Message',
                name: 'systemMessage',
                type: 'string',
                typeOptions: { rows: 4 },
                default: 'You are a helpful assistant.',
            },
            {
                displayName: 'User Message',
                name: 'userMessage',
                type: 'string',
                typeOptions: { rows: 4 },
                default: '',
                required: true,
            },
            {
                displayName: 'Temperature',
                name: 'temperature',
                type: 'number',
                typeOptions: { minValue: 0, maxValue: 2, numberPrecision: 1 },
                default: 0.7,
            },
            {
                displayName: 'Max Tokens',
                name: 'maxTokens',
                type: 'number',
                default: 256,
            },
        ],
    };

    methods = {
        loadOptions: {
            async getModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
                try {
                    const credentials = await this.getCredentials('telekomLlmApi');
                    const baseUrl = (credentials.baseUrl as string) || 'https://llm-server.llmhub.t-systems.net/v2';

                    const response = await this.helpers.httpRequestWithAuthentication.call(this, 'telekomLlmApi', {
                        method: 'GET',
                        url: '/models',
                        baseURL: baseUrl,
                    });

                    if (!response.data || !Array.isArray(response.data)) throw new Error('Invalid response');

                    return response.data
                        .map((m: any) => ({ name: m.id, value: m.id }))
                        .sort((a: any, b: any) => a.name.localeCompare(b.name));
                } catch {
                    return [
                        { name: 'llama-3.3-70B-Instruct (Fallback)', value: 'llama-3.3-70B-Instruct' },
                        { name: 'claude-3-5-sonnet (Fallback)', value: 'claude-3-5-sonnet' },
                        { name: 'gemini-2.5-flash (Fallback)', value: 'gemini-2.5-flash' },
                    ];
                }
            },
        },
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];
        const credentials = await this.getCredentials('telekomLlmApi');
        const baseUrl = credentials.baseUrl as string;

        for (let i = 0; i < items.length; i++) {
            const model = this.getNodeParameter('model', i) as string;
            const systemMessage = this.getNodeParameter('systemMessage', i) as string;
            const userMessage = this.getNodeParameter('userMessage', i) as string;
            const temperature = this.getNodeParameter('temperature', i) as number;
            const maxTokens = this.getNodeParameter('maxTokens', i) as number;

            const body = {
                model,
                messages: [
                    { role: 'system', content: systemMessage },
                    { role: 'user', content: userMessage },
                ],
                temperature,
                max_tokens: maxTokens,
            };

            const response = await this.helpers.httpRequestWithAuthentication.call(this, 'telekomLlmApi', {
                method: 'POST',
                url: '/chat/completions',
                baseURL: baseUrl,
                body,
                json: true,
            });

            returnData.push({ json: response, pairedItem: i });
        }
        return [returnData];
    }
}
