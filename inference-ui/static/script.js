document.addEventListener('DOMContentLoaded', () => {
    const promptInput = document.getElementById('promptInput');
    const temperatureSlider = document.getElementById('temperature');
    const temperatureValue = document.getElementById('temperatureValue');
    const maxTokensInput = document.getElementById('maxTokens');
    const generateBtn = document.getElementById('generateBtn');
    const responseDiv = document.getElementById('response');
    const responseType = document.getElementById('responseType');
    const endpointSelect = document.getElementById('endpoint');
    const modelStatus = document.getElementById('modelStatus');
    const guardrailsStatus = document.getElementById('guardrailsStatus');

    // Check API status on load
    checkModelInfo();

    temperatureSlider.addEventListener('input', (e) => {
        temperatureValue.textContent = e.target.value;
    });

    generateBtn.addEventListener('click', async () => {
        const prompt = promptInput.value;
        if (!prompt) {
            alert('Please enter a prompt');
            return;
        }

        generateBtn.disabled = true;
        generateBtn.textContent = 'Generating...';
        responseDiv.textContent = 'Generating response...';
        responseType.textContent = '';

        try {
            let endpointUrl = '/api/generate';
            let payload = {
                prompt: prompt,
                temperature: parseFloat(temperatureSlider.value),
                max_tokens: parseInt(maxTokensInput.value),
                stop: ["Q:"]
            };

            // If explicitly choosing chat endpoint
            if (endpointSelect.value === 'chat') {
                endpointUrl = '/api/chat';
                payload = {
                    message: prompt,
                    temperature: parseFloat(temperatureSlider.value),
                    max_tokens: parseInt(maxTokensInput.value)
                };
            }

            console.log(`Calling endpoint: ${endpointUrl} with payload:`, payload);
            const response = await fetch(endpointUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error('API request failed with status: ' + response.status);
            }

            const data = await response.json();
            console.log("Raw response from API:", data);
            
            // Handle different response formats
            if (data.text) {
                responseDiv.textContent = data.text;
                if (data.guardrailed) {
                    responseType.textContent = '(Guardrailed)';
                    responseType.className = 'response-type guardrailed';
                } else {
                    responseType.textContent = '(Direct LLM)';
                    responseType.className = 'response-type direct';
                }
            } else if (data.response) {
                responseDiv.textContent = data.response;
                responseType.textContent = '(Guardrailed)';
                responseType.className = 'response-type guardrailed';
            } else if (data.content) {
                responseDiv.textContent = data.content;
                responseType.textContent = '(Guardrailed)';
                responseType.className = 'response-type guardrailed';
            } else if (data.role && data.content) {
                responseDiv.textContent = data.content;
                responseType.textContent = '(Guardrailed)';
                responseType.className = 'response-type guardrailed';
            } else {
                responseDiv.textContent = JSON.stringify(data, null, 2);
                responseType.textContent = '(Raw Response)';
            }
        } catch (error) {
            responseDiv.textContent = 'Error: ' + error.message;
            responseType.textContent = '(Error)';
            responseType.className = 'response-type error';
            console.error("Error processing request:", error);
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generate';
        }
    });

    async function checkModelInfo() {
        try {
            const response = await fetch('/api/model-info');
            
            if (!response.ok) {
                modelStatus.textContent = 'API Status: Offline';
                modelStatus.className = 'status-indicator offline';
                return;
            }
            
            const data = await response.json();
            console.log("Model info:", data);
            
            // Check if we're using nemo-guardrails
            if (data.guardrails) {
                modelStatus.textContent = `Model: ${data.model}`;
                modelStatus.className = 'status-indicator online';
                
                guardrailsStatus.textContent = 'Guardrails: Enabled';
                guardrailsStatus.className = 'guardrails-indicator enabled';
                
                // Set the default endpoint to chat
                endpointSelect.value = 'chat';
            } else {
                modelStatus.textContent = `Model: ${data.model || 'Unknown'}`;
                modelStatus.className = 'status-indicator online';
                
                guardrailsStatus.textContent = 'Guardrails: Disabled';
                guardrailsStatus.className = 'guardrails-indicator disabled';
                
                // Set the default endpoint to generate
                endpointSelect.value = 'generate';
            }
        } catch (error) {
            modelStatus.textContent = 'API Status: Error';
            modelStatus.className = 'status-indicator error';
            console.error('Error checking model info:', error);
        }
    }
}); 