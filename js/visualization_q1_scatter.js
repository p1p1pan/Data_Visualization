document.addEventListener('DOMContentLoaded', async () => {
    const scatterDom = document.getElementById('scatter-chart-container-q1');
    if (!scatterDom) {
        console.error("Q1散点图容器 'scatter-chart-container-q1' 未找到!");
        return;
    }
    const q1ScatterChart = echarts.init(scatterDom);
    window.q1ScatterChart = q1ScatterChart; // 暴露图表实例，以便main_app调整大小或刷新

    // Q1 散点图特定控件
    const expenditureMinInputQ1 = document.getElementById('expenditure-filter-q1-min');
    const expenditureMaxInputQ1 = document.getElementById('expenditure-filter-q1-max');
    const expenditureRangeDisplayQ1 = document.getElementById('expenditure-range-display-q1'); // X轴: 教育经费合计
    const enrollmentMinInputQ1 = document.getElementById('enrollment-filter-q1-min');
    const enrollmentMaxInputQ1 = document.getElementById('enrollment-filter-q1-max');
    const enrollmentRangeDisplayQ1 = document.getElementById('enrollment-range-display-q1'); // Y轴: 高等学校入学率

    let q1RawData = []; 

    // 数字格式化函数，用于坐标轴和tooltip (亿/万)
    function formatAxisNumber(num) {
        if (typeof num !== 'number' || isNaN(num)) return 'N/A';
        if (num >= 100000000) return (num / 100000000).toFixed(1) + '亿';
        if (num >= 10000) return (num / 10000).toFixed(1) + '万';
        return num.toLocaleString();
    }
    // 加载Q1散点图数据
    async function loadQ1ScatterData() {
        try {
            const csvResponse = await fetch('data/q1.csv');
            if (!csvResponse.ok) throw new Error(`Q1散点图CSV数据(q1.csv)加载失败: ${csvResponse.statusText}`);
            const csvText = await csvResponse.text();
            const lines = csvText.trim().split('\n');
            const headersLine = lines[0];
            if (!headersLine) throw new Error("Q1散点图CSV文件(q1.csv)为空或无表头。");
            
            const headers = headersLine.split(',').map(h => h.trim().replace(/^[\ufeff]/, '')); 

            q1RawData = lines.slice(1).map(line => {
                const values = line.split(',').map(v => v.trim());
                const obj = {};
                headers.forEach((header, i) => {
                    const val = values[i];
                    const isEmpty = (val === '' || val === null || typeof val === 'undefined');
                    const cleanHeader = header; // BOM已在headers处理

                    if (cleanHeader === '地区') {
                        obj['地区'] = val;
                    } else if (cleanHeader === '高等学校入学率') {
                        obj['高等学校入学率'] = isEmpty ? null : parseFloat(val.replace('%', ''));
                    } else if (cleanHeader === '教育经费合计') {
                        obj['教育经费合计'] = isEmpty ? null : Number(val);
                    } else {
                        obj[cleanHeader.replace(/\s/g, '_')] = val; // 其他列存储
                    }
                });
                // 确保散点图需要的核心数据存在
                if (obj.hasOwnProperty('教育经费合计') && obj.hasOwnProperty('高等学校入学率')) {
                    return obj;
                }
                return null;
            }).filter(d => d && d['地区'] && d['教育经费合计'] !== null && d['高等学校入学率'] !== null);

            console.log("Q1散点图: q1.csv 数据加载并处理完毕", q1RawData.length);
            if (q1RawData.length === 0) {
                console.warn("Q1散点图: 加载后数据为空，请检查q1.csv（应含'地区', '高等学校入学率', '教育经费合计'）。");
            }
            return true;
        } catch (error) {
            console.error("Q1散点图数据加载或处理失败:", error);
            if(scatterDom) scatterDom.innerHTML = `<p style="color:red;">Q1散点图数据错误: ${error.message}</p>`;
            return false;
        }
    }

    // 初始化Q1散点图控件
    function initializeQ1ScatterControls() {
        if (!expenditureMinInputQ1 || !enrollmentMinInputQ1) {
            console.error("Q1散点图的筛选器控件未在HTML中完全定义。");
            return;
        }

        const defaultExpenditureMax = 500000000; // 默认最大经费 (调整前是50M)
        const defaultRateMax = 100;

        if (q1RawData.length === 0) {
            expenditureMinInputQ1.min = 0; expenditureMinInputQ1.max = defaultExpenditureMax;
            expenditureMaxInputQ1.min = 0; expenditureMaxInputQ1.max = defaultExpenditureMax;
            expenditureMinInputQ1.value = 0; expenditureMaxInputQ1.value = defaultExpenditureMax;

            enrollmentMinInputQ1.min = 0; enrollmentMinInputQ1.max = defaultRateMax;
            enrollmentMaxInputQ1.min = 0; enrollmentMaxInputQ1.max = defaultRateMax;
            enrollmentMinInputQ1.value = 0; enrollmentMaxInputQ1.value = defaultRateMax;
            updateQ1RangeDisplays();
            return;
        }

        const expenditures = q1RawData.map(d => d['教育经费合计']).filter(v => v !== null && !isNaN(v));
        const enrollments = q1RawData.map(d => d['高等学校入学率']).filter(v => v !== null && !isNaN(v));

        const minE_data = expenditures.length > 0 ? Math.min(...expenditures) : 0;
        const maxE_data = expenditures.length > 0 ? Math.max(...expenditures) : defaultExpenditureMax;
        expenditureMinInputQ1.min = minE_data; expenditureMinInputQ1.max = maxE_data;
        expenditureMaxInputQ1.min = minE_data; expenditureMaxInputQ1.max = maxE_data;
        expenditureMinInputQ1.value = minE_data; expenditureMaxInputQ1.value = maxE_data;
        if (Number(expenditureMinInputQ1.value) > Number(expenditureMaxInputQ1.value)) expenditureMaxInputQ1.value = expenditureMinInputQ1.value;


        enrollmentMinInputQ1.min = 0; enrollmentMinInputQ1.max = defaultRateMax;
        enrollmentMaxInputQ1.min = 0; enrollmentMaxInputQ1.max = defaultRateMax;
        let initialMinEn_val = enrollments.length > 0 ? Math.floor(Math.min(...enrollments)) : 0;
        let initialMaxEn_val = enrollments.length > 0 ? Math.ceil(Math.max(...enrollments)) : defaultRateMax;
        enrollmentMinInputQ1.value = Math.max(0, Math.min(defaultRateMax, initialMinEn_val));
        enrollmentMaxInputQ1.value = Math.max(0, Math.min(defaultRateMax, initialMaxEn_val));
        if (Number(enrollmentMinInputQ1.value) > Number(enrollmentMaxInputQ1.value)) enrollmentMaxInputQ1.value = enrollmentMinInputQ1.value;
        
        updateQ1RangeDisplays();
    }

    // 更新Q1范围显示文本
    function updateQ1RangeDisplays() {
        if (expenditureRangeDisplayQ1 && expenditureMinInputQ1 && expenditureMaxInputQ1) {
            expenditureRangeDisplayQ1.textContent = `${formatAxisNumber(Number(expenditureMinInputQ1.value))} - ${formatAxisNumber(Number(expenditureMaxInputQ1.value))} 元`;
        }
        if (enrollmentRangeDisplayQ1 && enrollmentMinInputQ1 && enrollmentMaxInputQ1) {
            enrollmentRangeDisplayQ1.textContent = `${Number(enrollmentMinInputQ1.value).toFixed(1)}% - ${Number(enrollmentMaxInputQ1.value).toFixed(1)}%`;
        }
    }

    // 更新Q1散点图
    function updateQ1ScatterPlot() {
        if (q1RawData.length === 0) {
            if(scatterDom) scatterDom.innerHTML = `<p style="text-align:center; padding-top:50px;">Q1散点图无数据显示。</p>`;
            if(q1ScatterChart && !q1ScatterChart.isDisposed()) q1ScatterChart.clear();
            return;
        }
        const minExp = Number(expenditureMinInputQ1.value);
        const maxExp = Number(expenditureMaxInputQ1.value);
        const minEnroll = Number(enrollmentMinInputQ1.value);
        const maxEnroll = Number(enrollmentMaxInputQ1.value);

        const filteredData = q1RawData.filter(d =>
            d['教育经费合计'] >= minExp && d['教育经费合计'] <= maxExp &&
            d['高等学校入学率'] >= minEnroll && d['高等学校入学率'] <= maxEnroll
        );

        const scatterData = filteredData.map(d => ({
            name: d['地区'],
            value: [d['教育经费合计'], d['高等学校入学率']],
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
                if (isFinite(trendMinX) && isFinite(trendMaxX)) { // 确保趋势线端点有效
                    trendLinePoints = [[trendMinX, m * trendMinX + b], [trendMaxX, m * trendMaxX + b]];
                }
            }
        }

        const scatterOption = {
            title: {
                text: '地区教育经费合计与高等学校入学率关系',
                left: 'center',
                textStyle: { fontSize: 16 }
            },
            tooltip: {
                trigger: 'item',
                formatter: params => {
                    if (!params.data || !params.data.value) return '';
                    return `<strong>地区: ${params.name}</strong><br/>
                            教育经费合计: ${formatAxisNumber(params.value[0])} 元<br/>
                            高等学校入学率: ${params.value[1].toFixed(2)}%`;
                }
            },
            xAxis: {
                name: '教育经费合计 (元)',
                type: 'value',
                scale: true, 
                axisLabel: { formatter: val => formatAxisNumber(val) }
            },
            yAxis: {
                name: '高等学校入学率 (%)',
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
                    itemStyle: { opacity: 0.7, color: '#2f79f9' },
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
                    lineStyle: { color: '#ff7f50', type: 'dashed', width: 2 },
                    z: 5 
                }
            ]
        };
        if(q1ScatterChart && !q1ScatterChart.isDisposed()) {
            q1ScatterChart.setOption(scatterOption, true);
        }
        

        // 高亮逻辑 (响应全局地图选择)
        if(q1ScatterChart && !q1ScatterChart.isDisposed()) {
            q1ScatterChart.dispatchAction({ type: 'downplay', seriesIndex: 0 }); // 先取消所有高亮
            if (window.currentSelectedGlobalRegion && window.currentSelectedGlobalRegion !== 'all') {
                const dataIndexToHighlight = scatterData.findIndex(item => item.name === window.currentSelectedGlobalRegion);
                if (dataIndexToHighlight !== -1) {
                    q1ScatterChart.dispatchAction({ type: 'highlight', seriesIndex: 0, dataIndex: dataIndexToHighlight });
                    q1ScatterChart.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: dataIndexToHighlight }); // 可选：同时显示tooltip
                }
            }
        }
    }

    // 主初始化函数 
    async function initQ1ScatterPlot() { 
        if(q1ScatterChart && !q1ScatterChart.isDisposed()){
             q1ScatterChart.showLoading({text: 'Q1散点图数据加载中...'});
        }
        const dataLoaded = await loadQ1ScatterData();
        if(q1ScatterChart && !q1ScatterChart.isDisposed()){
            q1ScatterChart.hideLoading();
        }

        if (dataLoaded) {
            initializeQ1ScatterControls();
            updateQ1ScatterPlot(); 

            const q1FilterInputs = [
                expenditureMinInputQ1, expenditureMaxInputQ1,
                enrollmentMinInputQ1, enrollmentMaxInputQ1
            ];
            q1FilterInputs.forEach(input => {
                if (input) {
                    input.addEventListener('input', () => {
                        updateQ1RangeDisplays();
                        updateQ1ScatterPlot();
                    });
                }
            });

            document.addEventListener('globalRegionChanged', (event) => {
                if (event.detail && typeof event.detail.region !== 'undefined') {
                    // window.currentSelectedGlobalRegion 已经由 main_app.js 更新
                    const q1View = document.getElementById('q1-scatter-view');
                    if (q1View && q1View.classList.contains('active-view') && q1ScatterChart && !q1ScatterChart.isDisposed()) {
                         updateQ1ScatterPlot(); // 重绘以应用高亮
                    }
                }
            });

        } else if (!dataLoaded) { 
             if(scatterDom) scatterDom.innerHTML = `<p style="text-align:center; padding-top:50px; color:red;">Q1散点图数据加载失败，请检查控制台。</p>`;
        }
    }

    initQ1ScatterPlot(); // 自执行初始化
});