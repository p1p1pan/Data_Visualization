document.addEventListener('DOMContentLoaded', () => {
    window.initVisualizationQ2 = async () => {
        const scatterDomQ2 = document.getElementById('scatter-chart-container-q2');
        if (!scatterDomQ2) {
            console.error("Q2散点图容器 'scatter-chart-container-q2' 未找到!");
            return;
        }
        const q2ScatterChart = echarts.init(scatterDomQ2);
        window.q2ScatterChart = q2ScatterChart; // 暴露图表实例

        // Q2 散点图特定控件
        const tsRatioMinInputQ2 = document.getElementById('tsratio-filter-q2-min');
        const tsRatioMaxInputQ2 = document.getElementById('tsratio-filter-q2-max');
        const tsRatioRangeDisplayQ2 = document.getElementById('tsratio-range-display-q2'); // X轴: 师生比
        const keySchoolMinInputQ2 = document.getElementById('keyschool-filter-q2-min');
        const keySchoolMaxInputQ2 = document.getElementById('keyschool-filter-q2-max');
        const keySchoolRangeDisplayQ2 = document.getElementById('keyschool-range-display-q2'); // Y轴: 重点中学比例

        let q2RawData = [];

        function formatTsRatio(num) { // 格式化师生比
            if (typeof num !== 'number' || isNaN(num)) return 'N/A';
            return num.toFixed(2);
        }

        function formatKeySchoolRate(num) { // 格式化重点中学比例
            if (typeof num !== 'number' || isNaN(num)) return 'N/A';
            return num.toFixed(1) + '%';
        }

        async function loadQ2ScatterData() {
            try {
                const csvResponse = await fetch('data/q2.csv');
                if (!csvResponse.ok) throw new Error(`Q2散点图CSV(q2.csv)加载失败: ${csvResponse.statusText}`);
                const csvText = await csvResponse.text();
                const lines = csvText.trim().split('\n');
                const headersLine = lines[0];
                if (!headersLine) throw new Error("Q2散点图CSV(q2.csv)为空或无表头。");
                
                const headers = headersLine.split(',').map(h => h.trim().replace(/^[\ufeff]/, ''));
                const regionHeader = headers[0]; 
                const tsRatioHeader = headers[1]; 
                const keySchoolHeader = headers[2]; 

                q2RawData = lines.slice(1).map(line => {
                    const values = line.split(',').map(v => v.trim());
                    if (values.length < headers.length) return null; // 行数据不完整

                    const obj = {};
                    obj[regionHeader] = values[0];
                    
                    const tsRatioVal = parseFloat(values[1]);
                    obj[tsRatioHeader] = isNaN(tsRatioVal) ? null : tsRatioVal;

                    const keySchoolValStr = values[2] ? values[2].replace('%', '') : '';
                    const keySchoolVal = parseFloat(keySchoolValStr);
                    obj[keySchoolHeader] = isNaN(keySchoolVal) ? null : keySchoolVal;
                    
                    if (obj[regionHeader] && obj[tsRatioHeader] !== null && obj[keySchoolHeader] !== null) {
                        return obj;
                    }
                    return null;
                }).filter(d => d);

                console.log("Q2散点图: q2.csv 数据加载并处理完毕", q2RawData.length);
                if (q2RawData.length === 0) {
                    console.warn("Q2散点图: 加载后数据为空，请检查q2.csv内容和列名。");
                }
                return true;
            } catch (error) {
                console.error("Q2散点图数据加载或处理失败:", error);
                if(scatterDomQ2) scatterDomQ2.innerHTML = `<p style="color:red;">Q2散点图数据错误: ${error.message}</p>`;
                return false;
            }
        }

        // 初始化Q2散点图控件
        function initializeQ2ScatterControls() {
            if (!tsRatioMinInputQ2 || !keySchoolMinInputQ2) {
                console.error("Q2散点图的筛选器控件未在HTML中完全定义。");
                return;
            }

            const defaultTsRatioMin = 5, defaultTsRatioMax = 20;
            const defaultKeySchoolMin = 0, defaultKeySchoolMax = 100;

            if (q2RawData.length === 0) {
                tsRatioMinInputQ2.min = defaultTsRatioMin; tsRatioMinInputQ2.max = defaultTsRatioMax;
                tsRatioMaxInputQ2.min = defaultTsRatioMin; tsRatioMaxInputQ2.max = defaultTsRatioMax;
                tsRatioMinInputQ2.value = defaultTsRatioMin; tsRatioMaxInputQ2.value = defaultTsRatioMax;

                keySchoolMinInputQ2.min = defaultKeySchoolMin; keySchoolMinInputQ2.max = defaultKeySchoolMax;
                keySchoolMaxInputQ2.min = defaultKeySchoolMin; keySchoolMaxInputQ2.max = defaultKeySchoolMax;
                keySchoolMinInputQ2.value = defaultKeySchoolMin; keySchoolMaxInputQ2.value = defaultKeySchoolMax;
                updateQ2RangeDisplays();
                return;
            }

            const tsRatios = q2RawData.map(d => d['师生比']).filter(v => v !== null && !isNaN(v));
            const keySchoolRates = q2RawData.map(d => d['重点中学比例']).filter(v => v !== null && !isNaN(v));

            const minTs_data = tsRatios.length > 0 ? Math.min(...tsRatios) : defaultTsRatioMin;
            const maxTs_data = tsRatios.length > 0 ? Math.max(...tsRatios) : defaultTsRatioMax;
            tsRatioMinInputQ2.min = minTs_data; tsRatioMinInputQ2.max = maxTs_data;
            tsRatioMaxInputQ2.min = minTs_data; tsRatioMaxInputQ2.max = maxTs_data;
            tsRatioMinInputQ2.value = minTs_data; tsRatioMaxInputQ2.value = maxTs_data;
            if (Number(tsRatioMinInputQ2.value) > Number(tsRatioMaxInputQ2.value)) tsRatioMaxInputQ2.value = tsRatioMinInputQ2.value;

            keySchoolMinInputQ2.min = defaultKeySchoolMin; keySchoolMinInputQ2.max = defaultKeySchoolMax;
            keySchoolMaxInputQ2.min = defaultKeySchoolMin; keySchoolMaxInputQ2.max = defaultKeySchoolMax;
            let initialMinKs_val = keySchoolRates.length > 0 ? Math.floor(Math.min(...keySchoolRates)) : defaultKeySchoolMin;
            let initialMaxKs_val = keySchoolRates.length > 0 ? Math.ceil(Math.max(...keySchoolRates)) : defaultKeySchoolMax;
            keySchoolMinInputQ2.value = Math.max(defaultKeySchoolMin, Math.min(defaultKeySchoolMax, initialMinKs_val));
            keySchoolMaxInputQ2.value = Math.max(defaultKeySchoolMin, Math.min(defaultKeySchoolMax, initialMaxKs_val));
            if (Number(keySchoolMinInputQ2.value) > Number(keySchoolMaxInputQ2.value)) keySchoolMaxInputQ2.value = keySchoolMinInputQ2.value;

            updateQ2RangeDisplays();
        }

        // 更新Q2筛选器显示
        function updateQ2RangeDisplays() {
            if (tsRatioRangeDisplayQ2 && tsRatioMinInputQ2 && tsRatioMaxInputQ2) {
                tsRatioRangeDisplayQ2.textContent = `${formatTsRatio(Number(tsRatioMinInputQ2.value))} - ${formatTsRatio(Number(tsRatioMaxInputQ2.value))}`;
            }
            if (keySchoolRangeDisplayQ2 && keySchoolMinInputQ2 && keySchoolMaxInputQ2) {
                keySchoolRangeDisplayQ2.textContent = `${formatKeySchoolRate(Number(keySchoolMinInputQ2.value))} - ${formatKeySchoolRate(Number(keySchoolMaxInputQ2.value))}`;
            }
        }
        
        // 更新Q2散点图
        function updateQ2ScatterPlot() {
            if (q2RawData.length === 0) {
                if(scatterDomQ2) scatterDomQ2.innerHTML = `<p style="text-align:center; padding-top:50px;">Q2散点图无数据显示。</p>`;
                if(q2ScatterChart && !q2ScatterChart.isDisposed()) q2ScatterChart.clear();
                return;
            }
            const minTs = Number(tsRatioMinInputQ2.value);
            const maxTs = Number(tsRatioMaxInputQ2.value);
            const minKs = Number(keySchoolMinInputQ2.value);
            const maxKs = Number(keySchoolMaxInputQ2.value);

            const filteredData = q2RawData.filter(d =>
                d['师生比'] >= minTs && d['师生比'] <= maxTs &&
                d['重点中学比例'] >= minKs && d['重点中学比例'] <= maxKs
            );

            const scatterData = filteredData.map(d => ({
                name: d['地区'],
                value: [d['师生比'], d['重点中学比例']],
                allData: d 
            }));

            let trendLinePoints = [];
            if (scatterData.length > 1) {
                let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
                const n = scatterData.length;
                scatterData.forEach(p => {
                    sumX += p.value[0]; sumY += p.value[1];
                    sumXY += p.value[0] * p.value[1]; sumX2 += p.value[0] * p.value[0];
                });
                const denominator = (n * sumX2 - sumX * sumX);
                let m, b; 
                if (denominator === 0) { m = 0; b = (n > 0 ? sumY / n : 0); }
                else { m = (n * sumXY - sumX * sumY) / denominator; b = (sumY - m * sumX) / n; }
                
                if (n > 0) {
                    const xValues = scatterData.map(p => p.value[0]);
                    const trendMinX = Math.min(...xValues);
                    const trendMaxX = Math.max(...xValues);
                    if (isFinite(trendMinX) && isFinite(trendMaxX)) {
                         trendLinePoints = [[trendMinX, m * trendMinX + b], [trendMaxX, m * trendMaxX + b]];
                    }
                }
            }

            const scatterOptionQ2 = {
                title: {
                    text: '地区师生比与重点中学比例关系',
                    left: 'center',
                    textStyle: { fontSize: 16 }
                },
                tooltip: {
                    trigger: 'item',
                    formatter: params => {
                        if (!params.data || !params.data.value) return '';
                        return `<strong>地区: ${params.name}</strong><br/>
                                师生比: ${formatTsRatio(params.value[0])}<br/>
                                重点中学比例: ${formatKeySchoolRate(params.value[1])}`;
                    }
                },
                xAxis: {
                    name: '师生比',
                    type: 'value',
                    scale: true,
                    axisLabel: { formatter: val => formatTsRatio(val) }
                },
                yAxis: {
                    name: '重点中学比例 (%)',
                    type: 'value',
                    scale: true,
                    axisLabel: { formatter: '{value}%' },
                    min: 0,
                    max: 100 
                },
                series: [
                    {
                        name: '地区数据',
                        type: 'scatter',
                        data: scatterData,
                        itemStyle: { opacity: 0.7, color: '#5470c6' },
                        symbolSize: 8,
                        emphasis: {
                            focus: 'series',
                            itemStyle: {
                                borderColor: 'red', borderWidth: 1.5,
                                shadowBlur: 5, shadowColor: 'rgba(0,0,0,0.3)'
                            }
                        }
                    },
                    {
                        name: '趋势线',
                        type: 'line',
                        data: trendLinePoints,
                        smooth: false,
                        showSymbol: false,
                        lineStyle: { color: '#91cc75', type: 'dashed', width: 2 },
                        z: 5 
                    }
                ]
            };
            if(q2ScatterChart && !q2ScatterChart.isDisposed()) {
                q2ScatterChart.setOption(scatterOptionQ2, true);
            }

            if(q2ScatterChart && !q2ScatterChart.isDisposed()) {
                q2ScatterChart.dispatchAction({ type: 'downplay', seriesIndex: 0 });
                if (window.currentSelectedGlobalRegion && window.currentSelectedGlobalRegion !== 'all') {
                    const dataIndexToHighlight = scatterData.findIndex(item => item.name === window.currentSelectedGlobalRegion);
                    if (dataIndexToHighlight !== -1) {
                        q2ScatterChart.dispatchAction({ type: 'highlight', seriesIndex: 0, dataIndex: dataIndexToHighlight });
                        q2ScatterChart.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: dataIndexToHighlight });
                    }
                }
            }
        }

        if(q2ScatterChart && !q2ScatterChart.isDisposed()) {
            q2ScatterChart.showLoading({text: 'Q2散点图数据加载中...'});
        }
        const dataLoaded = await loadQ2ScatterData();
        if(q2ScatterChart && !q2ScatterChart.isDisposed()) {
            q2ScatterChart.hideLoading();
        }
        

        if (dataLoaded) {
            initializeQ2ScatterControls();
            updateQ2ScatterPlot(); 

            const q2FilterInputs = [
                tsRatioMinInputQ2, tsRatioMaxInputQ2,
                keySchoolMinInputQ2, keySchoolMaxInputQ2
            ];
            q2FilterInputs.forEach(input => {
                if (input) {
                    input.addEventListener('input', () => {
                        updateQ2RangeDisplays();
                        updateQ2ScatterPlot();
                    });
                }
            });

            document.addEventListener('globalRegionChanged', (event) => {
                if (event.detail && typeof event.detail.region !== 'undefined') {
                    const q2View = document.getElementById('q2-scatter-view'); 
                    if (q2View && q2View.classList.contains('active-view') && q2ScatterChart && !q2ScatterChart.isDisposed()) {
                         updateQ2ScatterPlot(); 
                    }
                }
            });
        } else if (!dataLoaded) {
             if(scatterDomQ2) scatterDomQ2.innerHTML = `<p style="text-align:center; padding-top:50px; color:red;">Q2散点图数据加载失败，请检查控制台。</p>`;
        }
    };
});