document.addEventListener('DOMContentLoaded', () => {
    window.initEducationAttainmentChart = async () => {
        const chartDom = document.getElementById('education-attainment-chart-container');
        if (!chartDom) {
            console.error("人口受教育结构图表容器 'education-attainment-chart-container' 未找到!");
            return;
        }
        const displayTypeSelect = document.getElementById('education-display-type');

        let educationAttainmentChart = echarts.getInstanceByDom(chartDom);
        if(!educationAttainmentChart) {
            educationAttainmentChart = echarts.init(chartDom);
        }
        window.educationAttainmentChart = educationAttainmentChart;
        
        let rawData = [];
        const attainmentLevels = ['大学(大专及以上)', '高中（含中专）', '初中', '小学'];

        async function loadData() {
            try {
                educationAttainmentChart.showLoading({ text: '人口受教育数据加载中...' });
                const response = await fetch('data/educated.csv');
                if (!response.ok) throw new Error(`加载 educated.csv 失败: ${response.statusText}`);
                const csvText = await response.text();
                const lines = csvText.trim().split('\n');
                const headers = lines[0].split(',').map(h => h.trim().replace(/^[\ufeff]/, ''));
                
                rawData = lines.slice(1).map(line => {
                    const values = line.split(',');
                    const entry = {};
                    headers.forEach((header, i) => {
                        entry[header] = values[i] ? values[i].trim() : null;
                        if (header !== '地区' && entry[header] !== null) {
                            entry[header] = parseInt(entry[header], 10);
                        }
                    });
                    return entry['地区'] ? entry : null; // 确保有地区名
                }).filter(Boolean);

                console.log("Education attainment data loaded:", rawData.length);
                educationAttainmentChart.hideLoading();
                return rawData.length > 0;
            } catch (error) {
                console.error("加载或处理人口受教育数据失败:", error);
                educationAttainmentChart.hideLoading();
                chartDom.innerHTML = `<p style="color:red;">人口受教育数据加载错误: ${error.message}</p>`;
                return false;
            }
        }

        function updateChart() {
            if (rawData.length === 0) return;

            const displayType = displayTypeSelect.value; // 'percentage' or 'absolute'
            const regions = rawData.map(d => d['地区']);
            
            let seriesData = attainmentLevels.map(level => {
                return {
                    name: level,
                    type: 'bar',
                    stack: 'total',
                    emphasis: { focus: 'series' },
                    label: { // 可选：在柱子内部显示数值或百分比
                        show: displayType === 'percentage', // 只在百分比时显示，避免绝对数值过大重叠
                        position: 'inside',
                        formatter: '{c}%', // 如果是百分比，显示百分号
                        color: '#fff',
                        fontSize: 10
                    },
                    data: rawData.map(d => {
                        if (displayType === 'percentage') {
                            const totalEducated = attainmentLevels.reduce((sum, lvl) => sum + (d[lvl] || 0), 0);
                            return totalEducated > 0 ? ((d[level] || 0) / totalEducated * 100).toFixed(1) : 0;
                        }
                        return d[level] || 0;
                    })
                };
            });
            
            const option = {
                tooltip: {
                    trigger: 'axis',
                    axisPointer: { type: 'shadow' },
                    formatter: function (params) {
                        let tooltipStr = params[0].name + '<br/>';
                        params.forEach(item => {
                             const val = parseFloat(item.value) || 0;
                            let displayValue = displayType === 'percentage' ? val.toFixed(1) + '%' : val.toLocaleString() + '人/十万';
                            tooltipStr += `${item.marker} ${item.seriesName}: ${displayValue}<br/>`;
                        });
                        return tooltipStr;
                    }
                },
                legend: { data: attainmentLevels, bottom: 10, type: 'scroll' },
                grid: { left: '3%', right: '4%', bottom: '10%', containLabel: true },
                xAxis: { type: 'category', data: regions, axisLabel: { interval: 0, rotate: 30 } },
                yAxis: { 
                    type: 'value', 
                    name: displayType === 'percentage' ? '占比 (%)' : '每十万人受教育人数',
                    axisLabel: { formatter: displayType === 'percentage' ? '{value}%' : '{value}' },
                    max: displayType === 'percentage' ? 100 : null // 百分比时最大值为100
                },
                series: seriesData
            };
            educationAttainmentChart.setOption(option, true);
        }


        if (await loadData()) {
            updateChart();
            displayTypeSelect.addEventListener('change', updateChart);

            document.addEventListener('globalRegionChanged', (event) => {
                const eduView = document.getElementById('education-attainment-view');
                if (eduView && eduView.classList.contains('active-view')) {
                    const selectedRegion = event.detail.region;
                    educationAttainmentChart.dispatchAction({ type: 'downplay' });
                    if (selectedRegion && selectedRegion !== 'all') {
                        const dataIndex = rawData.findIndex(item => item['地区'] === selectedRegion);
                        if (dataIndex !== -1) {
                            educationAttainmentChart.dispatchAction({ type: 'highlight', seriesIndex: 0, dataIndex: dataIndex });
                            // educationAttainmentChart.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: dataIndex });
                        }
                    }
                }
            });
        }
    };
});