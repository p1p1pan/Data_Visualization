document.addEventListener('DOMContentLoaded', () => {
    window.initUniversityStats = async () => {
        const chartDom = document.getElementById('university-stats-chart-container');
        if (!chartDom) {
            console.error("高校统计图表容器 'university-stats-chart-container' 未找到!");
            return;
        }
        const uniTypePieDom = document.getElementById('uni-type-pie-container');
        const uniLevelPieDom = document.getElementById('uni-level-pie-container');
        const uniIndicatorRegionSpan = document.getElementById('uni-indicator-region');
        const uniTotalCountSpan = document.getElementById('uni-total-count');
        const uni985CountSpan = document.getElementById('uni-985-count');
        const uni211CountSpan = document.getElementById('uni-211-count');
        const uniDual一流CountSpan = document.getElementById('uni-dual-一流-count');

        const groupBySelect = document.getElementById('uni-stats-group-by');
        const uniSideInfoRegionSelect = document.getElementById('uni-sideinfo-region-select');
        
        let universityStatsChart = echarts.getInstanceByDom(chartDom);
        if (!universityStatsChart) {
            universityStatsChart = echarts.init(chartDom);
        }
        window.universityStatsChart = universityStatsChart;

        let uniTypePieChart = null;
        if (uniTypePieDom) {
            uniTypePieChart = echarts.getInstanceByDom(uniTypePieDom) || echarts.init(uniTypePieDom);
            window.uniTypePieChart = uniTypePieChart;
        }
        let uniLevelPieChart = null;
        if (uniLevelPieDom) {
            uniLevelPieChart = echarts.getInstanceByDom(uniLevelPieDom) || echarts.init(uniLevelPieDom);
            window.uniLevelPieChart = uniLevelPieChart;
        }

        let universityData = []; 
        let aggregatedData = {}; 
        let allRegionsForSideInfo = [];

        async function loadData() {
            try {
                universityStatsChart.showLoading({ text: '高校数据加载中...' });
                const response = await fetch('data/university.csv');
                if (!response.ok) throw new Error(`加载 university.csv 失败: ${response.statusText}`);
                const csvText = await response.text();
                const lines = csvText.trim().split('\n');
                const headers = lines[0].split(',').map(h => h.trim().replace(/^[\ufeff]/, ''));
                
                universityData = lines.slice(1).map(line => {
                    const values = line.split(',');
                    const entry = {};
                    headers.forEach((header, i) => {
                        entry[header] = values[i] ? values[i].trim() : '';
                    });
                    return entry;
                });
                console.log("University data loaded:", universityData.length);
                
                aggregateData();
                allRegionsForSideInfo = Object.keys(aggregatedData).sort();
                populateUniSideInfoRegionSelect();

                universityStatsChart.hideLoading();
                return universityData.length > 0;
            } catch (error) {
                console.error("加载或处理高校数据失败:", error);
                universityStatsChart.hideLoading();
                if (chartDom) chartDom.innerHTML = `<p style="color:red;">高校数据加载错误: ${error.message}</p>`;
                return false;
            }
        }
        
        function populateUniSideInfoRegionSelect() {
            if (!uniSideInfoRegionSelect) return;
            uniSideInfoRegionSelect.innerHTML = ''; 
            allRegionsForSideInfo.forEach(region => {
                const option = document.createElement('option');
                option.value = region;
                option.textContent = region;
                uniSideInfoRegionSelect.appendChild(option);
            });
             const currentGlobalRegion = window.currentSelectedGlobalRegion;
            if (currentGlobalRegion && currentGlobalRegion !== 'all' && allRegionsForSideInfo.includes(currentGlobalRegion)) {
                uniSideInfoRegionSelect.value = currentGlobalRegion;
            } else if (allRegionsForSideInfo.length > 0) {
                 uniSideInfoRegionSelect.value = allRegionsForSideInfo[0];
            }
        }


        function aggregateData() {
            aggregatedData = {};
            const allProvinces = [...new Set(universityData.map(d => d['省份']))].filter(Boolean); // 确保省份名有效
            
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
                    if (!isKey) { aggregatedData[province].keyProjects['非重点']++; }
                });
            });
            // console.log("Aggregated university data:", aggregatedData);
        }

        function updateMainChart() {
            if (Object.keys(aggregatedData).length === 0) return;

            const groupBy = groupBySelect.value;
            const regions = Object.keys(aggregatedData).sort(); 
            let series = [];
            let legendData = [];
            let yAxisName = '大学数量';

            switch (groupBy) {
                case 'type':
                    const allTypes = [...new Set(universityData.flatMap(uni => uni['类型'] ? uni['类型'] : []))].sort();
                    legendData = allTypes;
                    series = allTypes.map(type => ({
                        name: type, type: 'bar', stack: 'total', emphasis: { focus: 'series' },
                        data: regions.map(region => aggregatedData[region].types[type] || 0)
                    }));
                    break;
                case 'level':
                    const allLevels = [...new Set(universityData.flatMap(uni => uni['本或专科'] ? uni['本或专科'] : []))].filter(Boolean).sort();
                    legendData = allLevels;
                    series = allLevels.map(level => ({
                        name: level, type: 'bar', stack: 'total', emphasis: { focus: 'series' },
                        data: regions.map(region => aggregatedData[region].levels[level] || 0)
                    }));
                    break;
                case 'public_private':
                    const allPubPriv = [...new Set(universityData.flatMap(uni => uni['公或民办'] ? uni['公或民办'] : []))].filter(Boolean).sort();
                    legendData = allPubPriv;
                     series = allPubPriv.map(pp => ({
                        name: pp, type: 'bar', stack: 'total', emphasis: { focus: 'series' },
                        data: regions.map(region => aggregatedData[region].publicPrivate[pp] || 0)
                    }));
                    break;
                case 'key_project':
                    const keyProjectTypes = ['985', '211', '双一流']; // 只显示重点项目，非重点不在此处对比
                    legendData = keyProjectTypes.map(kp => {
                        if (kp === '双一流') return '双一流高校数';
                        return kp + '高校数';
                    });
                    series = keyProjectTypes.map(kp => ({
                        name: legendData[keyProjectTypes.indexOf(kp)], 
                        type: 'bar', 
                        barGap: 0, // 分组柱状图设置
                        emphasis: { focus: 'series' },
                        data: regions.map(region => aggregatedData[region].keyProjects[kp] || 0)
                    }));
                     yAxisName = '重点高校数量';
                    break;
            }
            
            const option = {
                tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                legend: { data: legendData, bottom: 10, type: 'scroll' },
                grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
                xAxis: { type: 'category', data: regions, axisLabel: { interval: 0, rotate: 30, fontSize: 10 } },
                yAxis: { type: 'value', name: yAxisName },
                series: series
            };
            universityStatsChart.setOption(option, true);
            
            if (uniSideInfoRegionSelect.value) {
                updateSideInfo(uniSideInfoRegionSelect.value);
            } else if (allRegionsForSideInfo.length > 0) {
                updateSideInfo(allRegionsForSideInfo[0]);
            }
        }

        function updateSideInfo(regionName) {
            if (!regionName || !aggregatedData[regionName]) {
                uniIndicatorRegionSpan.textContent = "请选择地区";
                uniTotalCountSpan.textContent = "-";
                uni985CountSpan.textContent = "-";
                uni211CountSpan.textContent = "-";
                uniDual一流CountSpan.textContent = "-";
                if(uniTypePieChart) uniTypePieChart.clear();
                if(uniLevelPieChart) uniLevelPieChart.clear();
                if(uniTypePieDom) uniTypePieDom.innerHTML = `<p style="text-align:center; padding-top:20px;">请选择地区</p>`;
                if(uniLevelPieDom) uniLevelPieDom.innerHTML = `<p style="text-align:center; padding-top:20px;">请选择地区</p>`;
                return;
            }
            if(uniTypePieDom) uniTypePieDom.innerHTML = ''; 
            if(uniLevelPieDom) uniLevelPieDom.innerHTML = '';


            const dataToShow = aggregatedData[regionName];

            uniIndicatorRegionSpan.textContent = regionName;
            uniTotalCountSpan.textContent = (dataToShow.total || 0).toLocaleString();
            uni985CountSpan.textContent = (dataToShow.keyProjects['985'] || 0).toLocaleString();
            uni211CountSpan.textContent = (dataToShow.keyProjects['211'] || 0).toLocaleString();
            uniDual一流CountSpan.textContent = (dataToShow.keyProjects['双一流'] || 0).toLocaleString();

            if (uniTypePieChart) {
                const typePieData = Object.entries(dataToShow.types)
                    .map(([name, value]) => ({ name, value }))
                    .filter(d => d.value > 0);
                uniTypePieChart.setOption({
                    title: { text: `${regionName} - 高校类型`, left: 'center', textStyle: { fontSize: 14 } },
                    tooltip: { trigger: 'item', formatter: '{a} <br/>{b} : {c} ({d}%)' },
                    legend: { orient: 'vertical', left: 10, top: 30, data: typePieData.map(d=>d.name), type:'scroll'},
                    series: [{ name: '类型分布', type: 'pie', radius: '60%', center: ['60%', '55%'], data: typePieData,
                        label: { show: true, formatter: '{b}\n{d}%', fontSize:10 }, labelLine: { show: true }
                    }]
                }, true);
            }
            if (uniLevelPieChart) {
                const levelPieData = Object.entries(dataToShow.levels)
                    .map(([name, value]) => ({ name, value }))
                    .filter(d => d.value > 0);
                uniLevelPieChart.setOption({
                    title: { text: `${regionName} - 办学层次`, left: 'center', textStyle: { fontSize: 14 } },
                    tooltip: { trigger: 'item', formatter: '{a} <br/>{b} : {c} ({d}%)' },
                    legend: { orient: 'vertical', left: 10, top: 30, data: levelPieData.map(d=>d.name), type:'scroll' },
                    series: [{ name: '层次分布', type: 'pie', radius: '60%', center: ['60%', '55%'], data: levelPieData,
                        label: { show: true, formatter: '{b}\n{d}%', fontSize:10 }, labelLine: { show: true }
                    }]
                }, true);
            }
        }


        if (await loadData()) {
            updateMainChart();
            groupBySelect.addEventListener('change', updateMainChart);
            if (uniSideInfoRegionSelect) {
                uniSideInfoRegionSelect.addEventListener('change', (e) => updateSideInfo(e.target.value));
            }


            document.addEventListener('globalRegionChanged', (event) => {
                const uniView = document.getElementById('university-stats-view');
                if (uniView && uniView.classList.contains('active-view')) {
                    const selectedRegion = event.detail.region;
                    
                    if (selectedRegion && selectedRegion !== 'all' && allRegionsForSideInfo.includes(selectedRegion)) {
                        uniSideInfoRegionSelect.value = selectedRegion; 
                        updateSideInfo(selectedRegion);
                    } else if (allRegionsForSideInfo.length > 0) { 
                        uniSideInfoRegionSelect.value = allRegionsForSideInfo[0]; 
                        updateSideInfo(allRegionsForSideInfo[0]);
                    }

                    universityStatsChart.dispatchAction({ type: 'downplay' });
                    if (selectedRegion && selectedRegion !== 'all') {
                        const regions = Object.keys(aggregatedData).sort();
                        const dataIndex = regions.indexOf(selectedRegion);
                        if (dataIndex !== -1) {
                            // 高亮主柱状图的对应地区
                           // universityStatsChart.dispatchAction({ type: 'highlight', seriesIndex: 0, dataIndex: dataIndex });
                           // 遍历所有系列进行高亮
                            const seriesCount = universityStatsChart.getOption().series.length;
                            for (let i = 0; i < seriesCount; i++) {
                                universityStatsChart.dispatchAction({ type: 'highlight', seriesIndex: i, dataIndex: dataIndex });
                            }
                        }
                    }
                }
            });
        }
    };
});