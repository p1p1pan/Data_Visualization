document.addEventListener('DOMContentLoaded', () => {
    window.initVisualizationQ3 = async () => {
        const scatterDomQ3 = document.getElementById('scatter-chart-container-q3');
        if (!scatterDomQ3) {
            console.error("Q3散点图容器 'scatter-chart-container-q3' 未找到!");
            return;
        }
        const q3ScatterChart = echarts.init(scatterDomQ3);
        window.q3ScatterChart = q3ScatterChart; // 暴露图表实例

        // Q3 散点图特定控件
        const tier1RateMinInputQ3 = document.getElementById('tier1rate-filter-q3-min');
        const tier1RateMaxInputQ3 = document.getElementById('tier1rate-filter-q3-max');
        const tier1RateRangeDisplayQ3 = document.getElementById('tier1rate-range-display-q3'); 
        const keySchoolMinInputQ3 = document.getElementById('keyschool-filter-q3-min');
        const keySchoolMaxInputQ3 = document.getElementById('keyschool-filter-q3-max');
        const keySchoolRangeDisplayQ3 = document.getElementById('keyschool-range-display-q3');

        let q3RawData = [];

        function formatPercentageRate(num, digits = 1) { // 格式化百分比
            if (typeof num !== 'number' || isNaN(num)) return 'N/A';
            return num.toFixed(digits) + '%';
        }

        // 加载Q3散点图数据
        async function loadQ3ScatterData() {
            try {
                const csvResponse = await fetch('data/q3.csv'); 
                if (!csvResponse.ok) throw new Error(`Q3散点图CSV(q3.csv)加载失败: ${csvResponse.statusText}`);
                const csvText = await csvResponse.text();
                const lines = csvText.trim().split('\n');
                const headersLine = lines[0];
                if (!headersLine) throw new Error("Q3散点图CSV(q3.csv)为空或无表头。");
                
                const headers = headersLine.split(',').map(h => h.trim().replace(/^[\ufeff]/, ''));
                const regionHeader = "地区"; 
                const tier1RateHeader = "一本率"; 
                const keySchoolHeader = "重点中学比例";

                q3RawData = lines.slice(1).map(line => {
                    const values = line.split(',').map(v => v.trim());
                    if (values.length < headers.length) return null;

                    const obj = {};
                    const regionIdx = headers.indexOf(regionHeader);
                    const tier1Idx = headers.indexOf(tier1RateHeader);
                    const keySchoolIdx = headers.indexOf(keySchoolHeader);

                    if (regionIdx === -1 || tier1Idx === -1 || keySchoolIdx === -1) {
                        console.warn("Q3 CSV表头 ('地区', '一本率', '重点中学比例') 未全部找到或顺序不符:", headers);
                        return null; 
                    }
                    
                    obj[regionHeader] = values[regionIdx];
                    
                    const tier1ValStr = values[tier1Idx] ? values[tier1Idx].replace('%', '') : '';
                    const tier1Val = parseFloat(tier1ValStr);
                    obj[tier1RateHeader] = isNaN(tier1Val) ? null : tier1Val;

                    const keySchoolValStr = values[keySchoolIdx] ? values[keySchoolIdx].replace('%', '') : '';
                    const keySchoolVal = parseFloat(keySchoolValStr);
                    obj[keySchoolHeader] = isNaN(keySchoolVal) ? null : keySchoolVal;
                    
                    // 两个绘图指标都必须有有效值
                    if (obj[regionHeader] && obj[tier1RateHeader] !== null && obj[keySchoolHeader] !== null) {
                        return obj;
                    }
                    return null; 
                }).filter(d => d);

                console.log("Q3散点图: q3.csv 数据加载并处理完毕", q3RawData.length);
                if (q3RawData.length === 0) {
                    console.warn("Q3散点图: 加载后数据为空，请检查q3.csv内容和列名。");
                }
                return true;
            } catch (error) {
                console.error("Q3散点图数据加载或处理失败:", error);
                if(scatterDomQ3) scatterDomQ3.innerHTML = `<p style="color:red;">Q3散点图数据错误: ${error.message}</p>`;
                return false;
            }
        }
        // 初始化Q3散点图控件
        function initializeQ3ScatterControls() {
            if (!tier1RateMinInputQ3 || !keySchoolMinInputQ3) {
                console.error("Q3散点图的筛选器控件未在HTML中完全定义。");
                return;
            }

            const defaultMinRate = 0, defaultMaxRate = 100;

            if (q3RawData.length === 0) {
                tier1RateMinInputQ3.min = defaultMinRate; tier1RateMinInputQ3.max = defaultMaxRate;
                tier1RateMaxInputQ3.min = defaultMinRate; tier1RateMaxInputQ3.max = defaultMaxRate;
                tier1RateMinInputQ3.value = defaultMinRate; tier1RateMaxInputQ3.value = defaultMaxRate;

                keySchoolMinInputQ3.min = defaultMinRate; keySchoolMinInputQ3.max = defaultMaxRate;
                keySchoolMaxInputQ3.min = defaultMinRate; keySchoolMaxInputQ3.max = defaultMaxRate;
                keySchoolMinInputQ3.value = defaultMinRate; keySchoolMaxInputQ3.value = defaultMaxRate;
                updateQ3RangeDisplays();
                return;
            }

            const tier1Rates = q3RawData.map(d => d['一本率']).filter(v => v !== null && !isNaN(v));
            const keySchoolRates = q3RawData.map(d => d['重点中学比例']).filter(v => v !== null && !isNaN(v));

            tier1RateMinInputQ3.min = defaultMinRate; tier1RateMinInputQ3.max = defaultMaxRate;
            tier1RateMaxInputQ3.min = defaultMinRate; tier1RateMaxInputQ3.max = defaultMaxRate;
            let initialMinT1 = tier1Rates.length > 0 ? Math.floor(Math.min(...tier1Rates)) : defaultMinRate;
            let initialMaxT1 = tier1Rates.length > 0 ? Math.ceil(Math.max(...tier1Rates)) : defaultMaxRate;
            tier1RateMinInputQ3.value = Math.max(defaultMinRate, Math.min(defaultMaxRate, initialMinT1));
            tier1RateMaxInputQ3.value = Math.max(defaultMinRate, Math.min(defaultMaxRate, initialMaxT1));
            if (Number(tier1RateMinInputQ3.value) > Number(tier1RateMaxInputQ3.value)) tier1RateMaxInputQ3.value = tier1RateMinInputQ3.value;

            keySchoolMinInputQ3.min = defaultMinRate; keySchoolMinInputQ3.max = defaultMaxRate;
            keySchoolMaxInputQ3.min = defaultMinRate; keySchoolMaxInputQ3.max = defaultMaxRate;
            let initialMinKs = keySchoolRates.length > 0 ? Math.floor(Math.min(...keySchoolRates)) : defaultMinRate;
            let initialMaxKs = keySchoolRates.length > 0 ? Math.ceil(Math.max(...keySchoolRates)) : defaultMaxRate;
            keySchoolMinInputQ3.value = Math.max(defaultMinRate, Math.min(defaultMaxRate, initialMinKs));
            keySchoolMaxInputQ3.value = Math.max(defaultMinRate, Math.min(defaultMaxRate, initialMaxKs));
            if (Number(keySchoolMinInputQ3.value) > Number(keySchoolMaxInputQ3.value)) keySchoolMaxInputQ3.value = keySchoolMinInputQ3.value;
            
            updateQ3RangeDisplays();
        }
        // 更新Q3范围显示
        function updateQ3RangeDisplays() {
            if (tier1RateRangeDisplayQ3 && tier1RateMinInputQ3 && tier1RateMaxInputQ3) {
                tier1RateRangeDisplayQ3.textContent = `${formatPercentageRate(Number(tier1RateMinInputQ3.value), 2)} - ${formatPercentageRate(Number(tier1RateMaxInputQ3.value), 2)}`;
            }
            if (keySchoolRangeDisplayQ3 && keySchoolMinInputQ3 && keySchoolMaxInputQ3) {
                keySchoolRangeDisplayQ3.textContent = `${formatPercentageRate(Number(keySchoolMinInputQ3.value), 1)} - ${formatPercentageRate(Number(keySchoolMaxInputQ3.value), 1)}`;
            }
        }
        // 更新Q3散点图
        function updateQ3ScatterPlot() {
            if (q3RawData.length === 0) {
                if(scatterDomQ3) scatterDomQ3.innerHTML = `<p style="text-align:center; padding-top:50px;">Q3散点图无数据显示。</p>`;
                if(q3ScatterChart && !q3ScatterChart.isDisposed()) q3ScatterChart.clear();
                return;
            }
            const minT1 = Number(tier1RateMinInputQ3.value);
            const maxT1 = Number(tier1RateMaxInputQ3.value);
            const minKs = Number(keySchoolMinInputQ3.value);
            const maxKs = Number(keySchoolMaxInputQ3.value);

            const filteredData = q3RawData.filter(d =>
                d['一本率'] >= minT1 && d['一本率'] <= maxT1 &&
                d['重点中学比例'] >= minKs && d['重点中学比例'] <= maxKs
            );

            const scatterData = filteredData.map(d => ({
                name: d['地区'],
                value: [d['一本率'], d['重点中学比例']],
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

            const scatterOptionQ3 = {
                title: {
                    text: '地区一本率与重点中学比例关系',
                    left: 'center',
                    textStyle: { fontSize: 16 }
                },
                tooltip: {
                    trigger: 'item',
                    formatter: params => {
                        if (!params.data || !params.data.value) return '';
                        return `<strong>地区: ${params.name}</strong><br/>
                                一本率: ${formatPercentageRate(params.value[0], 2)}<br/>
                                重点中学比例: ${formatPercentageRate(params.value[1], 1)}`;
                    }
                },
                xAxis: {
                    name: '一本率 (%)',
                    type: 'value',
                    scale: true,
                    axisLabel: { formatter: '{value}%' },
                    min: 0, 
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
                        itemStyle: { opacity: 0.7, color: '#fac858' }, 
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
                        lineStyle: { color: '#ee6666', type: 'dashed', width: 2 }, 
                        z: 5 
                    }
                ]
            };
            if(q3ScatterChart && !q3ScatterChart.isDisposed()) {
                q3ScatterChart.setOption(scatterOptionQ3, true);
            }

            if(q3ScatterChart && !q3ScatterChart.isDisposed()) {
                q3ScatterChart.dispatchAction({ type: 'downplay', seriesIndex: 0 });
                if (window.currentSelectedGlobalRegion && window.currentSelectedGlobalRegion !== 'all') {
                    const dataIndexToHighlight = scatterData.findIndex(item => item.name === window.currentSelectedGlobalRegion);
                    if (dataIndexToHighlight !== -1) {
                        q3ScatterChart.dispatchAction({ type: 'highlight', seriesIndex: 0, dataIndex: dataIndexToHighlight });
                        q3ScatterChart.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: dataIndexToHighlight });
                    }
                }
            }
        }

        if(q3ScatterChart && !q3ScatterChart.isDisposed()) {
            q3ScatterChart.showLoading({text: 'Q3散点图数据加载中...'});
        }
        const dataLoaded = await loadQ3ScatterData();
        if(q3ScatterChart && !q3ScatterChart.isDisposed()) {
            q3ScatterChart.hideLoading();
        }
        

        if (dataLoaded) {
            initializeQ3ScatterControls();
            updateQ3ScatterPlot(); 

            const q3FilterInputs = [
                tier1RateMinInputQ3, tier1RateMaxInputQ3,
                keySchoolMinInputQ3, keySchoolMaxInputQ3
            ];
            q3FilterInputs.forEach(input => {
                if (input) {
                    input.addEventListener('input', () => {
                        updateQ3RangeDisplays();
                        updateQ3ScatterPlot();
                    });
                }
            });

            document.addEventListener('globalRegionChanged', (event) => {
                if (event.detail && typeof event.detail.region !== 'undefined') {
                    const q3View = document.getElementById('q3-scatter-view');
                    if (q3View && q3View.classList.contains('active-view') && q3ScatterChart && !q3ScatterChart.isDisposed()) {
                         updateQ3ScatterPlot();
                    }
                }
            });
        } else if (!dataLoaded) {
             if(scatterDomQ3) scatterDomQ3.innerHTML = `<p style="text-align:center; padding-top:50px; color:red;">Q3散点图数据加载失败，请检查控制台。</p>`;
        }
    };
});