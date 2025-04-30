// URLs for fetching data
const idsUrl = 'https://raw.githubusercontent.com/CodyCBakerPhD/dandiset-access-summaries/main/summaries/dandiset_ids.txt';
const baseTsvUrl = 'https://raw.githubusercontent.com/CodyCBakerPhD/dandiset-access-summaries/main/summaries/';

// Function to handle Plotly loading errors
function handlePlotlyError() {
    console.error('Failed to load Plotly library.');
    document.body.innerHTML = '<h1>Error: Plotly library could not be loaded.</h1>';
}

// Check if Plotly is loaded after the window loads
window.addEventListener('load', () => {
    if (typeof Plotly === 'undefined') {
        handlePlotlyError();
    }
});

// Populate the dropdown with IDs
fetch(idsUrl)
    .then((response) => {
        if (!response.ok) {
            throw new Error(`Failed to fetch IDs: ${response.statusText}`);
        }
        return response.text();
    })
    .then((text) => {
        const ids = text.split('\n').filter((id) => id.trim() !== '');
        const select = document.getElementById('dandisetSelect');

        if (!select) {
            throw new Error('Dropdown element not found.');
        }

        ids.forEach((id) => {
            const option = document.createElement('option');
            option.value = id;
            option.textContent = id;
            select.appendChild(option);
        });

        // Load the chart for the first ID by default
        if (ids.length > 0) {
            loadChart(ids[0]);
        }

        // Update the chart when a new ID is selected
        select.addEventListener('change', (event) => {
            const target = event.target;
            loadChart(target.value);
        });
    })
    .catch((error) => {
        console.error('Error:', error);
        const chartElement = document.getElementById('chart');
        if (chartElement) {
            chartElement.innerText = 'Failed to load IDs.';
        }
    });

// Function to fetch and render the chart for a given ID
function loadChart(dandisetId) {
    const tsvUrl = `${baseTsvUrl}${dandisetId}/dandiset_summary_by_day.tsv`;

    fetch(tsvUrl)
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Failed to fetch TSV file: ${response.statusText}`);
            }
            return response.text();
        })
        .then((text) => {
            const rows = text.split('\n').filter((row) => row.trim() !== '');
            if (rows.length < 2) {
                throw new Error('TSV file does not contain enough data.');
            }

            const headers = rows[0].split('\t');
            const data = rows.slice(1).map((row) => row.split('\t'));

            // Assuming the TSV has columns: Date, Full Downloads, Streaming
            const dates = data.map((row) => row[0]);
            const fullDownloads = data.map((row) => parseInt(row[1], 10));
            const streaming = data.map((row) => parseInt(row[2], 10));

            const plotData = [
                {
                    x: dates,
                    y: fullDownloads,
                    type: 'scatter',
                    mode: 'lines+markers',
                    name: 'Full Downloads'
                },
                {
                    x: dates,
                    y: streaming,
                    type: 'scatter',
                    mode: 'lines+markers',
                    name: 'Streaming'
                }
            ];

            Plotly.newPlot('plot', plotData, {
                title: `Dandiset Access Stats (${dandisetId})`,
                xaxis: { title: 'Date' },
                yaxis: { title: 'Count' }
            });
        })
        .catch((error) => {
            console.error('Error:', error);
            const chartElement = document.getElementById('chart');
            if (chartElement) {
                chartElement.innerText = 'Failed to load data.';
            }
        });
}