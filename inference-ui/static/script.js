document.addEventListener('DOMContentLoaded', () => {
    const promptInput = document.getElementById('promptInput');
    const temperatureSlider = document.getElementById('temperature');
    const temperatureValue = document.getElementById('temperatureValue');
    const maxTokensInput = document.getElementById('maxTokens');
    const generateBtn = document.getElementById('generateBtn');
    const responseDiv = document.getElementById('response');

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

        try {
            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: prompt,
                    temperature: parseFloat(temperatureSlider.value),
                    max_tokens: parseInt(maxTokensInput.value),
                    stop: ["Q:"]
                })
            });

            if (!response.ok) {
                throw new Error('API request failed');
            }

            const data = await response.json();
            responseDiv.textContent = data.response;
        } catch (error) {
            responseDiv.textContent = 'Error: ' + error.message;
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = 'Generate';
        }
    });
}); 