document.addEventListener('DOMContentLoaded', () => {
    const regionCheckboxContainer = document.getElementById('region-checkboxes-comparison');
    const indicatorCheckboxContainer = document.getElementById('indicator-checkboxes-comparison');
    const generateBtn = document.getElementById('generate-comparison-chart-btn');
    const chartContainer = document.getElementById('main-comparison-chart-container');
    const chartPlaceholder = document.getElementById('comparison-chart-placeholder');

    // 获取地区选择操作按钮
    const regionSelectAllBtn = document.getElementById('region-select-all-btn');
    const regionResetBtn = document.getElementById('region-reset-btn');
    // 获取指标选择操作按钮
    const indicatorSelectAllBtn = document.getElementById('indicator-select-all-btn');
    const indicatorResetBtn = document.getElementById('indicator-reset-btn');

    let allRegionsData = []; // 将从全局事件或 window.mapRawData 获取
    let comparisonChartInstance = null; // ECharts 实例

    const availableIndicators = [
        { id: '一本率', name: '一本率', unit: '%' },
        { id: '重点中学比例', name: '重点中学比例', unit: '%' },
        { id: '师生比', name: '师生比', unit: '' },
        { id: '高等教育毛入学率', name: '高等教育毛入学率', unit: '%' },
        { id: '教育经费合计', name: '教育经费合计', unit: '元' }
    ];

    function populateCheckboxes() {
        if (!regionCheckboxContainer || !indicatorCheckboxContainer) {
            console.error("Comparison chart checkbox containers not found.");
            return;
        }
        regionCheckboxContainer.innerHTML = ''; 
        indicatorCheckboxContainer.innerHTML = '';

        if (!allRegionsData || allRegionsData.length === 0) {
            regionCheckboxContainer.innerHTML = "<p>地区数据尚未加载。</p>";
            indicatorCheckboxContainer.innerHTML = "<p>指标定义或数据尚未加载。</p>";
            return;
        }

        const uniqueRegions = Array.from(new Set(allRegionsData.map(d => d['地区']))).sort();
        uniqueRegions.forEach(regionName => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox'; checkbox.value = regionName; checkbox.name = 'comparison_region_select';
            label.appendChild(checkbox); label.appendChild(document.createTextNode(" " + regionName));
            regionCheckboxContainer.appendChild(label);
        });

        availableIndicators.forEach(indicator => {
            if (allRegionsData.some(d => d.hasOwnProperty(indicator.id) && d[indicator.id] !== null && !isNaN(parseFloat(d[indicator.id])))) {
                const label = document.createElement('label');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox'; checkbox.value = indicator.id; checkbox.name = 'comparison_indicator_select';
                label.appendChild(checkbox); label.appendChild(document.createTextNode(" " + indicator.name + (indicator.unit ? ` (${indicator.unit})` : '')));
                indicatorCheckboxContainer.appendChild(label);
            }
        });
         if (regionCheckboxContainer.childElementCount === 0)  regionCheckboxContainer.innerHTML = "<p>未能提取到地区列表。</p>";
         if (indicatorCheckboxContainer.childElementCount === 0) indicatorCheckboxContainer.innerHTML = "<p>未能提取到可用指标列表。</p>";
    }

    function generateChart() {
        if (!chartContainer || !allRegionsData || allRegionsData.length === 0) {
            if (chartPlaceholder) chartPlaceholder.textContent = "数据未加载或图表容器不存在。";
            if (chartContainer) chartContainer.style.display = 'none';
            return;
        }

        const selectedRegionNames = Array.from(document.querySelectorAll('input[name="comparison_region_select"]:checked')).map(cb => cb.value);
        const selectedIndicatorIds = Array.from(document.querySelectorAll('input[name="comparison_indicator_select"]:checked')).map(cb => cb.value);

        if (selectedRegionNames.length === 0 || selectedIndicatorIds.length === 0) {
            if (chartPlaceholder) {
                chartPlaceholder.textContent = "请至少选择一个地区和一个指标。";
                chartPlaceholder.style.display = 'block';
            }
            if (chartContainer) chartContainer.style.display = 'none';
            if (comparisonChartInstance) comparisonChartInstance.clear();
            return;
        }
        
        if (chartPlaceholder) chartPlaceholder.style.display = 'none';
        if (chartContainer) chartContainer.style.display = 'block';

        if (!comparisonChartInstance || comparisonChartInstance.isDisposed()) {
            comparisonChartInstance = echarts.init(chartContainer);
        } else {
            comparisonChartInstance.clear();
        }

        const selectedIndicatorObjects = selectedIndicatorIds.map(id => availableIndicators.find(ind => ind.id === id)).filter(Boolean);

        const legendData = [];
        const seriesData = [];
        const yAxisConfigurations = [];
        const colorPalette = ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'];
        let yAxisIndexCounter = 0;
        const unitToYAxisIndexMap = {};

        selectedIndicatorObjects.forEach((indicator, index) => {
            legendData.push(indicator.name); 

            let currentYAxisIndex;
            if (typeof unitToYAxisIndexMap[indicator.unit] !== 'undefined') {
                currentYAxisIndex = unitToYAxisIndexMap[indicator.unit];
            } else {
                currentYAxisIndex = yAxisIndexCounter;
                unitToYAxisIndexMap[indicator.unit] = currentYAxisIndex;
                
                let yAxisName = indicator.name; 
                let yAxisFormatter = '{value}';
                if (indicator.unit === '%') {
                    yAxisName = `${indicator.name} (%)`; 
                    yAxisFormatter = '{value}%';
                } else if (indicator.unit === '元') {
                    yAxisName = `${indicator.name} (元)`; 
                }

                yAxisConfigurations.push({
                    type: 'value',
                    name: yAxisName,
                    nameTextStyle: { padding: [0, 0, 0, (yAxisIndexCounter % 2 !== 0 ? 0 : 50)] },
                    position: yAxisIndexCounter % 2 === 0 ? 'left' : 'right', 
                    offset: yAxisIndexCounter > 1 ? (Math.floor(yAxisIndexCounter / 2)) * 65 : 0, 
                    axisLine: { show: true, lineStyle: { color: colorPalette[yAxisIndexCounter % colorPalette.length] } }, // 使用 yAxisIndexCounter 保证轴和系列颜色一致性
                    axisLabel: { formatter: yAxisFormatter },
                    splitLine: { show: yAxisIndexCounter === 0 } 
                });
                yAxisIndexCounter++;
            }

            seriesData.push({
                name: indicator.name,
                type: 'bar',
                yAxisIndex: currentYAxisIndex, 
                barGap: '20%', 
                barCategoryGap: '30%', 
                emphasis: { focus: 'series' },
                itemStyle: { color: colorPalette[index % colorPalette.length] }, 
                data: selectedRegionNames.map(regionName => {
                    const regionCompleteData = allRegionsData.find(d => d['地区'] === regionName);
                    return regionCompleteData && regionCompleteData[indicator.id] !== null && !isNaN(parseFloat(regionCompleteData[indicator.id]))
                           ? parseFloat(regionCompleteData[indicator.id])
                           : null; 
                })
            });
        });
        
        if (yAxisConfigurations.length === 0) {
            yAxisConfigurations.push({type: 'value', name: '数值'});
        }

        const option = {
            title: {
                text: '区域指标对比分析',
                subtext: `地区: ${selectedRegionNames.join(', ')}`, 
                left: 'center',
                textStyle: { fontSize: 18 }
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: { type: 'shadow' },
                formatter: function (params) { 
                    let tooltipStr = params[0].name + '<br/>'; 
                    params.forEach(item => {
                        const indicatorObj = availableIndicators.find(ind => ind.name === item.seriesName);
                        const unit = indicatorObj ? indicatorObj.unit : '';
                        const value = item.value !== null && !isNaN(item.value) ? item.value : '无数据';
                        tooltipStr += `${item.marker} ${item.seriesName}: ${value}${unit}<br/>`;
                    });
                    return tooltipStr;
                }
            },
            legend: {
                data: legendData, 
                bottom: 10,
                type: 'scroll',
                textStyle: { fontSize: 10 }
            },
            grid: {
                left: yAxisConfigurations.some(ax => ax.position === 'left' && ax.offset > 0) ? '12%' : (yAxisConfigurations.some(ax => ax.position === 'left') ? '5%' : '3%'), 
                right: yAxisConfigurations.some(ax => ax.position === 'right' && ax.offset > 0) ? '12%' : (yAxisConfigurations.some(ax => ax.position === 'right') ? '5%' : '4%'),
                bottom: legendData.length > Math.floor((chartContainer.offsetWidth || 600) / 100) ? '18%' : '12%', 
                containLabel: true
            },
            xAxis: {
                type: 'category',
                data: selectedRegionNames, 
                axisLabel: {
                    interval: 0,
                    rotate: selectedRegionNames.length > 5 ? 30 : (selectedRegionNames.length > 3 ? 15 : 0),
                    fontSize: 10
                }
            },
            yAxis: yAxisConfigurations.length === 1 ? yAxisConfigurations[0] : yAxisConfigurations, 
            series: seriesData
        };

        comparisonChartInstance.setOption(option);
    }

    function initializeModule(data) {
        allRegionsData = data; 
        if (allRegionsData && allRegionsData.length > 0) {
            populateCheckboxes(); 
            
            if (generateBtn) { // generateBtn 是主生成图表按钮
                generateBtn.addEventListener('click', generateChart);
            } else { 
                console.error("按钮 'generate-comparison-chart-btn' 未找到。"); 
            }

            // --- 地区选择按钮事件监听 ---
            if (regionSelectAllBtn) {
                regionSelectAllBtn.addEventListener('click', () => {
                    const regionCheckboxes = regionCheckboxContainer.querySelectorAll('input[type="checkbox"][name="comparison_region_select"]');
                    regionCheckboxes.forEach(checkbox => { checkbox.checked = true; });
                });
            } else {
                console.error("按钮 'region-select-all-btn' 未找到。");
            }

            if (regionResetBtn) {
                regionResetBtn.addEventListener('click', () => {
                    const regionCheckboxes = regionCheckboxContainer.querySelectorAll('input[type="checkbox"][name="comparison_region_select"]');
                    regionCheckboxes.forEach(checkbox => { checkbox.checked = false; });
                });
            } else {
                console.error("按钮 'region-reset-btn' 未找到。");
            }

            // --- 指标选择按钮事件监听 ---
            if (indicatorSelectAllBtn) {
                indicatorSelectAllBtn.addEventListener('click', () => {
                    const indicatorCheckboxes = indicatorCheckboxContainer.querySelectorAll('input[type="checkbox"][name="comparison_indicator_select"]');
                    indicatorCheckboxes.forEach(checkbox => { checkbox.checked = true; });
                });
            } else {
                console.error("按钮 'indicator-select-all-btn' 未找到。");
            }

            if (indicatorResetBtn) {
                indicatorResetBtn.addEventListener('click', () => {
                    const indicatorCheckboxes = indicatorCheckboxContainer.querySelectorAll('input[type="checkbox"][name="comparison_indicator_select"]');
                    indicatorCheckboxes.forEach(checkbox => { checkbox.checked = false; });
                });
            } else {
                console.error("按钮 'indicator-reset-btn' 未找到。");
            }

        } else {
            console.warn("对比图表模块: 接收到的数据为空或无效。");
            populateCheckboxes(); 
            if (generateBtn) generateBtn.disabled = true;
        }
    }

    document.addEventListener('mapDataReady', (event) => {
        console.log('对比图表模块监听到: mapDataReady 事件。');
        if (event.detail && event.detail.mapRawData) {
            initializeModule(event.detail.mapRawData);
        } else {
            console.error('对比图表模块: mapDataReady 事件的 detail 中缺少 mapRawData。');
            initializeModule([]);
        }
    });

    if (typeof window.mapRawData !== 'undefined') { 
        if(!allRegionsData || allRegionsData.length === 0){ 
             console.log("对比图表模块: window.mapRawData 在DOMContentLoaded时已可用 (后备方案)。");
            initializeModule(window.mapRawData);
        }
    }

    window.addEventListener('resize', () => {
        if (comparisonChartInstance && !comparisonChartInstance.isDisposed()) {
            comparisonChartInstance.resize();
        }
    });
});