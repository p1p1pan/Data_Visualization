document.addEventListener('DOMContentLoaded', () => {
    window.initUniversityStats = async () => {
        const chartDom = document.getElementById('university-stats-chart-container');
        if (!chartDom) {
            console.error("高校统计图表容器 'university-stats-chart-container' 未找到!");
            return;
        }
        const uniPieChartDom = document.getElementById('uni-pie-chart-container'); 

        const uniIndicatorRegionSpan = document.getElementById('uni-indicator-region');
        const uniTotalCountSpan = document.getElementById('uni-total-count');
        const uni985CountSpan = document.getElementById('uni-985-count');
        const uni211CountSpan = document.getElementById('uni-211-count');
        const uniDualCountSpan = document.getElementById('uni-dual-一流-count');

        const groupBySelect = document.getElementById('uni-stats-group-by');
        const uniSideInfoRegionSelect = document.getElementById('uni-sideinfo-region-select');
        const uniPieDisplayBySelect = document.getElementById('uni-pie-display-by');
        const universityTableContainer = document.getElementById('university-summary-table-container'); // Table container
        
        let universityStatsChart = echarts.getInstanceByDom(chartDom);
        if (!universityStatsChart || universityStatsChart.isDisposed()) {
            universityStatsChart = echarts.init(chartDom);
        }
        window.universityStatsChart = universityStatsChart;

        let uniPieChart = null;
        if (uniPieChartDom) {
            uniPieChart = echarts.getInstanceByDom(uniPieChartDom) || echarts.init(uniPieChartDom);
            window.uniPieChart = uniPieChart;
        } else {
            console.error("Pie chart container 'uni-pie-chart-container' not found!");
        }

        let universityData = []; 
        let aggregatedData = {}; 
        let allRegionsForSideInfo = [];
        let allUniversityCsvHeaders = []; // To store headers from university.csv

        async function loadData() {
            try {
                if (universityStatsChart && !universityStatsChart.isDisposed()) {
                    universityStatsChart.showLoading({ text: '高校数据加载中...' });
                }
                const response = await fetch('data/university.csv');
                if (!response.ok) throw new Error(`加载 university.csv 失败: ${response.statusText}`);
                const csvText = await response.text();
                const lines = csvText.trim().split('\n');
                const headersLine = lines[0];
                if (!headersLine) throw new Error("university.csv为空或无表头。");
                allUniversityCsvHeaders = headersLine.split(',').map(h => h.trim().replace(/^[\ufeff]/, ''));


                universityData = lines.slice(1).map(line => {
                    const values = line.split(',');
                    const entry = {};
                    allUniversityCsvHeaders.forEach((header, i) => {
                        entry[header] = values[i] ? values[i].trim() : '';
                    });
                    return entry;
                }).filter(entry => entry['省份']); 
                console.log("University data loaded:", universityData.length);
                
                aggregateData();
                allRegionsForSideInfo = Object.keys(aggregatedData).sort();
                populateUniSideInfoRegionSelect();

                if (universityStatsChart && !universityStatsChart.isDisposed()) {
                    universityStatsChart.hideLoading();
                }
                return universityData.length > 0;
            } catch (error) {
                console.error("加载或处理高校数据失败:", error);
                if (universityStatsChart && !universityStatsChart.isDisposed()) {
                    universityStatsChart.hideLoading();
                }
                if (chartDom) chartDom.innerHTML = `<p style="color:red;">高校数据加载错误: ${error.message}</p>`;
                if (universityTableContainer) universityTableContainer.innerHTML = `<p style="text-align:center; color:red;">高校列表数据加载错误: ${error.message}</p>`;
                return false;
            }
        }
        
        function populateUniSideInfoRegionSelect() {
            if (!uniSideInfoRegionSelect) return;
            uniSideInfoRegionSelect.innerHTML = '<option value="">请选择地区</option>'; 
            allRegionsForSideInfo.forEach(region => {
                const option = document.createElement('option');
                option.value = region;
                option.textContent = region;
                uniSideInfoRegionSelect.appendChild(option);
            });
            
            const currentGlobalRegion = window.currentSelectedGlobalRegion;
            if (currentGlobalRegion && currentGlobalRegion !== 'all' && allRegionsForSideInfo.includes(currentGlobalRegion)) {
                uniSideInfoRegionSelect.value = currentGlobalRegion;
            }
        }

        function aggregateData() {
            aggregatedData = {};
            const allProvinces = [...new Set(universityData.map(d => d['省份']))].filter(Boolean);
            
            allProvinces.forEach(province => {
                const regionUnis = universityData.filter(uni => uni['省份'] === province);
                aggregatedData[province] = {
                    total: regionUnis.length,
                    types: {},
                    levels: {},
                    publicPrivate: {},
                    keyProjects: { '985': 0, '211': 0, '双一流': 0, '非重点': 0 }
                };

                regionUnis.forEach(uni => {
                    const type = uni['类型'] || '未知类型';
                    aggregatedData[province].types[type] = (aggregatedData[province].types[type] || 0) + 1;
                    
                    const level = uni['本或专科'] || '未知层次';
                    aggregatedData[province].levels[level] = (aggregatedData[province].levels[level] || 0) + 1;
                    
                    const pubPriv = uni['公或民办'] || '未知办学性质';
                    aggregatedData[province].publicPrivate[pubPriv] = (aggregatedData[province].publicPrivate[pubPriv] || 0) + 1;
                    
                    let isKey = false;
                    if (uni['985'] === '1') { aggregatedData[province].keyProjects['985']++; isKey = true;}
                    if (uni['211'] === '1') { aggregatedData[province].keyProjects['211']++; isKey = true;}
                    if (uni['双一流'] === '双一流') { aggregatedData[province].keyProjects['双一流']++; isKey = true;}
                    if (!isKey) { aggregatedData[province].keyProjects['非重点']++;}
                });
            });
        }

        function updateMainChart() {
            if (Object.keys(aggregatedData).length === 0 || !universityStatsChart || universityStatsChart.isDisposed()) return;

            const groupBy = groupBySelect.value;
            const regions = Object.keys(aggregatedData).sort(); 
            let series = [];
            let legendData = [];
            let yAxisName = '大学数量';
            let chartTitle = '各地区高校数量分布';

            switch (groupBy) {
                case 'type':
                    const allTypes = [...new Set(universityData.flatMap(uni => uni['类型'] ? [uni['类型']] : ['未知类型']))].sort();
                    legendData = allTypes;
                    series = allTypes.map(type => ({
                        name: type, type: 'bar', stack: 'total', emphasis: { focus: 'series' },
                        data: regions.map(region => aggregatedData[region].types[type] || 0)
                    }));
                    chartTitle = '各地区高校类型分布';
                    break;
                case 'level':
                    const allLevels = [...new Set(universityData.flatMap(uni => uni['本或专科'] ? [uni['本或专科']] : ['未知层次']))].filter(Boolean).sort();
                    legendData = allLevels;
                    series = allLevels.map(level => ({
                        name: level, type: 'bar', stack: 'total', emphasis: { focus: 'series' },
                        data: regions.map(region => aggregatedData[region].levels[level] || 0)
                    }));
                    chartTitle = '各地区高校办学层次分布';
                    break;
                case 'public_private':
                    const allPubPriv = [...new Set(universityData.flatMap(uni => uni['公或民办'] ? [uni['公或民办']] : ['未知办学性质']))].filter(Boolean).sort();
                    legendData = allPubPriv;
                    series = allPubPriv.map(pp => ({
                        name: pp, type: 'bar', stack: 'total', emphasis: { focus: 'series' },
                        data: regions.map(region => aggregatedData[region].publicPrivate[pp] || 0)
                    }));
                    chartTitle = '各地区高校公办/民办分布';
                    break;
                case 'key_project':
                    const keyProjectTypes = ['985', '211', '双一流']; 
                    legendData = keyProjectTypes.map(kp => kp === '双一流' ? '双一流高校数' : kp + '高校数');
                    series = keyProjectTypes.map(kp => ({
                        name: legendData[keyProjectTypes.indexOf(kp)], 
                        type: 'bar', 
                        emphasis: { focus: 'series' },
                        data: regions.map(region => aggregatedData[region].keyProjects[kp] || 0)
                    }));
                    yAxisName = '重点高校数量';
                    chartTitle = '各地区重点高校建设情况';
                    break;
            }
            
            const option = {
                title: { text: chartTitle, left: 'center', textStyle: { fontSize: 16 } },
                tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                legend: { data: legendData, bottom: 10, type: 'scroll' },
                grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
                xAxis: { type: 'category', data: regions, axisLabel: { interval: 0, rotate: 30, fontSize: 10 } },
                yAxis: { type: 'value', name: yAxisName },
                series: series
            };
            universityStatsChart.setOption(option, true);
        }
        
        function showPiePlaceholder(chartInstance, domElement, message) {
            if (chartInstance && !chartInstance.isDisposed()) {
                chartInstance.clear(); 
                chartInstance.setOption({
                    title: {
                        text: message,
                        left: 'center',
                        top: 'center',
                        textStyle: { fontSize: 12, color: '#888' }
                    }
                });
            } else if (domElement) { 
                domElement.innerHTML = `<p style="text-align:center; padding-top:50px; color:#888;">${message}</p>`;
            }
        }

        function renderUniversityTable(regionName) {
            if (!universityTableContainer || universityData.length === 0) {
                if (universityTableContainer) universityTableContainer.innerHTML = '<p style="text-align:center;">列表数据加载中或无数据...</p>';
                return;
            }

            if (!regionName || regionName === "") {
                universityTableContainer.innerHTML = '<p style="text-align:center;">请选择一个地区以查看高校列表。</p>';
                return;
            }

            const regionUnis = universityData.filter(uni => uni['省份'] === regionName);

            if (regionUnis.length === 0) {
                universityTableContainer.innerHTML = `<p style="text-align:center;">“${regionName}”地区没有高校数据。</p>`;
                return;
            }

            // Define headers to display (exclude '省份' and '地址')
            const displayHeaders = allUniversityCsvHeaders.filter(header => header !== '省份' && header !== '地址');

            let tableHTML = '<table border="1" style="width:100%; border-collapse: collapse; font-size: 0.9em;"><thead><tr>';
            displayHeaders.forEach(header => {
                tableHTML += `<th>${header}</th>`;
            });
            tableHTML += '</tr></thead><tbody>';

            regionUnis.forEach(uni => {
                tableHTML += '<tr>';
                displayHeaders.forEach(header => {
                    tableHTML += `<td>${uni[header] || '-'}</td>`;
                });
                tableHTML += '</tr>';
            });

            tableHTML += '</tbody></table>';
            universityTableContainer.innerHTML = tableHTML;
        }


        function updateSideInfo(regionName) {
            if (!uniPieChartDom || !uniIndicatorRegionSpan) return;

            if (!uniPieChart || uniPieChart.isDisposed()) {
                if (uniPieChartDom) uniPieChart = echarts.init(uniPieChartDom);
                window.uniPieChart = uniPieChart;
            }

            renderUniversityTable(regionName); // Call table rendering function

            if (!regionName || regionName === "" || !aggregatedData[regionName]) {
                uniIndicatorRegionSpan.textContent = "请选择地区";
                uniTotalCountSpan.textContent = "-";
                uni985CountSpan.textContent = "-";
                uni211CountSpan.textContent = "-";
                uniDualCountSpan.textContent = "-";
                showPiePlaceholder(uniPieChart, uniPieChartDom, "请选择地区查看详情");
                return;
            }

            const dataToShow = aggregatedData[regionName];
            uniIndicatorRegionSpan.textContent = regionName;
            uniTotalCountSpan.textContent = (dataToShow.total || 0).toLocaleString();
            uni985CountSpan.textContent = (dataToShow.keyProjects['985'] || 0).toLocaleString();
            uni211CountSpan.textContent = (dataToShow.keyProjects['211'] || 0).toLocaleString();
            uniDualCountSpan.textContent = (dataToShow.keyProjects['双一流'] || 0).toLocaleString();

            const pieDisplayBy = uniPieDisplayBySelect.value;
            let pieDataRaw;
            let pieTitleSuffix;
            let pieSeriesName;

            switch (pieDisplayBy) {
                case 'type':
                    pieDataRaw = dataToShow.types;
                    pieTitleSuffix = '高校类型分布';
                    pieSeriesName = '类型分布';
                    break;
                case 'level':
                    pieDataRaw = dataToShow.levels;
                    pieTitleSuffix = '办学层次分布';
                    pieSeriesName = '层次分布';
                    break;
                case 'public_private':
                    pieDataRaw = dataToShow.publicPrivate;
                    pieTitleSuffix = '公办/民办分布';
                    pieSeriesName = '办学性质';
                    break;
                case 'key_project':
                    // For key projects, filter out "非重点" if you only want to show 985, 211, 双一流
                    pieDataRaw = Object.fromEntries(
                        Object.entries(dataToShow.keyProjects).filter(([key, _]) => key !== '非重点')
                    );
                    pieTitleSuffix = '重点建设分布';
                    pieSeriesName = '重点项目';
                    break;
                default:
                    pieDataRaw = {};
                    pieTitleSuffix = '分布';
                    pieSeriesName = '分布';
            }
            
            const pieData = Object.entries(pieDataRaw).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);

            if (uniPieChart && !uniPieChart.isDisposed()) {
                if (pieData.length > 0) {
                    uniPieChart.setOption({
                        title: { text: `${regionName} - ${pieTitleSuffix}`, left: 'center', textStyle: { fontSize: 14 } },
                        tooltip: { trigger: 'item', formatter: '{a} <br/>{b} : {c} ({d}%)' },
                        legend: { orient: 'vertical', left: 10, top: 30, data: pieData.map(d => d.name), type: 'scroll' },
                        series: [{
                            name: pieSeriesName, type: 'pie', radius: '60%', center: ['60%', '55%'], data: pieData,
                            emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' } },
                            label: { show: true, formatter: '{b}\n{d}%', fontSize: 10 }, labelLine: { show: true }
                        }]
                    }, true); 
                } else {
                    showPiePlaceholder(uniPieChart, uniPieChartDom, `“${regionName}”地区无有效“${pieTitleSuffix}”数据`);
                }
                uniPieChart.resize();
            }
        }

        if (await loadData()) {
            updateMainChart(); 
            if (uniSideInfoRegionSelect.value && uniSideInfoRegionSelect.value !== "") {
                updateSideInfo(uniSideInfoRegionSelect.value);
            } else {
                 updateSideInfo(null); 
            }

            groupBySelect.addEventListener('change', updateMainChart);
            if (uniSideInfoRegionSelect) {
                uniSideInfoRegionSelect.addEventListener('change', (e) => updateSideInfo(e.target.value));
            }
            if (uniPieDisplayBySelect) {
                uniPieDisplayBySelect.addEventListener('change', () => {
                    // Only update side info if a region is actually selected
                    if (uniSideInfoRegionSelect.value && uniSideInfoRegionSelect.value !== "") {
                        updateSideInfo(uniSideInfoRegionSelect.value);
                    } else {
                        // Optionally, prompt user to select a region or clear the pie chart
                        showPiePlaceholder(uniPieChart, uniPieChartDom, "请先选择地区，再选择饼图显示方式");
                    }
                });
            }


            document.addEventListener('globalRegionChanged', (event) => {
                const uniView = document.getElementById('university-stats-view');
                if (uniView && uniView.classList.contains('active-view')) {
                    const selectedRegion = event.detail.region;
                    
                    if (selectedRegion && selectedRegion !== 'all' && allRegionsForSideInfo.includes(selectedRegion)) {
                        if (uniSideInfoRegionSelect) uniSideInfoRegionSelect.value = selectedRegion; 
                        updateSideInfo(selectedRegion);
                    } else if (selectedRegion === 'all') { 
                        if (uniSideInfoRegionSelect) uniSideInfoRegionSelect.value = ""; 
                        updateSideInfo(null); 
                    } else {
                        if (uniSideInfoRegionSelect) uniSideInfoRegionSelect.value = "";
                        updateSideInfo(null);
                    }

                    if (universityStatsChart && !universityStatsChart.isDisposed()) {
                        universityStatsChart.dispatchAction({ type: 'downplay' });
                        if (selectedRegion && selectedRegion !== 'all') {
                            const regions = Object.keys(aggregatedData).sort();
                            const dataIndex = regions.indexOf(selectedRegion);
                            if (dataIndex !== -1) {
                                const currentOption = universityStatsChart.getOption();
                                if (currentOption && currentOption.series) {
                                    const seriesCount = currentOption.series.length;
                                    for (let i = 0; i < seriesCount; i++) {
                                        universityStatsChart.dispatchAction({ type: 'highlight', seriesIndex: i, dataIndex: dataIndex });
                                    }
                                     universityStatsChart.dispatchAction({ type: 'showTip', seriesIndex: 0, dataIndex: dataIndex });
                                }
                            }
                        }
                    }
                }
            });
        } else {
            if (chartDom) chartDom.innerHTML = `<p style="text-align:center; padding-top:50px; color:red;">高校数据加载失败。</p>`;
            updateSideInfo(null);
            if (universityTableContainer) universityTableContainer.innerHTML = `<p style="text-align:center; color:red;">高校列表数据加载失败。</p>`;
        }
    };
});