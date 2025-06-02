document.addEventListener('DOMContentLoaded', () => {
    window.initTeacherStructureChart = async () => {
        const chartDom = document.getElementById('teacher-structure-chart-container');
        if (!chartDom) {
            console.error("教师结构图表容器 'teacher-structure-chart-container' 未找到!");
            return;
        }
        const educationPieDom = document.getElementById('teacher-education-pie-container');
        const titlePieDom = document.getElementById('teacher-title-pie-container');

        // 控件
        const stackBySelect = document.getElementById('teacher-stack-by');
        const valueTypeSelect = document.getElementById('teacher-value-type');
        const teacherPieRegionSelect = document.getElementById('teacher-pie-region-select');

        let teacherStructureChart = echarts.getInstanceByDom(chartDom);
        if (!teacherStructureChart || teacherStructureChart.isDisposed()) {
            teacherStructureChart = echarts.init(chartDom);
        }
        window.teacherStructureChart = teacherStructureChart;

        let teacherEducationPieChart = null;
        if (educationPieDom) {
            teacherEducationPieChart = echarts.getInstanceByDom(educationPieDom) || echarts.init(educationPieDom);
            window.teacherEducationPieChart = teacherEducationPieChart;
        } else {
            console.error("Education pie chart container 'teacher-education-pie-container' not found!");
        }
        
        let teacherTitlePieChart = null;
        if (titlePieDom) {
            teacherTitlePieChart = echarts.getInstanceByDom(titlePieDom) || echarts.init(titlePieDom);
            window.teacherTitlePieChart = teacherTitlePieChart;
        } else {
            console.error("Title pie chart container 'teacher-title-pie-container' not found!");
        }

        let rawData = [];
        const educationLevels = ['博士研究生', '硕士研究生', '本科毕业', '专科毕业', '高中阶段毕业', '高中阶段毕业以下'];
        const titles = ['正高级', '副高级', '中级', '助理级', '员级', '未定职级'];
        let allRegionsForPies = [];

        async function loadData() {
            try {
                if (teacherStructureChart && !teacherStructureChart.isDisposed()) {
                    teacherStructureChart.showLoading({ text: '教师结构数据加载中...' });
                }
                const response = await fetch('data/teacher.csv');
                if (!response.ok) throw new Error(`加载 teacher.csv 失败: ${response.statusText}`);
                const csvText = await response.text();
                const lines = csvText.trim().split('\n');
                const headers = lines[0].split(',').map(h => h.trim().replace(/^[\ufeff]/, ''));
                
                rawData = lines.slice(1).map(line => {
                    const values = line.split(',');
                    const entry = {};
                    headers.forEach((header, i) => {
                        const val = values[i] ? values[i].trim() : null;
                        if (header !== '地区' && val !== null && val !== '') {
                            entry[header] = parseInt(val, 10);
                        } else if (header === '地区') {
                            entry[header] = val;
                        } else {
                            entry[header] = 0; // Default to 0 if data is missing for a category
                        }
                    });
                    return entry['地区'] && entry['地区'] !== '总计' ? entry : null;
                }).filter(Boolean);

                allRegionsForPies = [...new Set(rawData.map(d => d['地区']))].sort();
                populateTeacherPieRegionSelect();

                console.log("Teacher structure data loaded:", rawData.length);
                if (teacherStructureChart && !teacherStructureChart.isDisposed()) {
                    teacherStructureChart.hideLoading();
                }
                return rawData.length > 0;
            } catch (error) {
                console.error("加载或处理教师结构数据失败:", error);
                if (teacherStructureChart && !teacherStructureChart.isDisposed()) {
                    teacherStructureChart.hideLoading();
                }
                if (chartDom) chartDom.innerHTML = `<p style="color:red;">教师结构数据加载错误: ${error.message}</p>`;
                return false;
            }
        }

        function populateTeacherPieRegionSelect() {
            if (!teacherPieRegionSelect) return;
            teacherPieRegionSelect.innerHTML = ''; 
            allRegionsForPies.forEach(region => {
                const option = document.createElement('option');
                option.value = region;
                option.textContent = region;
                teacherPieRegionSelect.appendChild(option);
            });
            
            const currentGlobalRegion = window.currentSelectedGlobalRegion;
            if (currentGlobalRegion && currentGlobalRegion !== 'all' && allRegionsForPies.includes(currentGlobalRegion)) {
                teacherPieRegionSelect.value = currentGlobalRegion;
            } else if (allRegionsForPies.length > 0) {
                 teacherPieRegionSelect.value = allRegionsForPies[0];
            }
        }

        function updateChart() {
            if (rawData.length === 0 || !teacherStructureChart || teacherStructureChart.isDisposed()) return;

            const stackBy = stackBySelect.value; 
            const valueType = valueTypeSelect.value; 
            
            let categoriesToStack, seriesData;
            const regions = rawData.map(d => d['地区']);

            if (stackBy === 'education') {
                categoriesToStack = educationLevels;
            } else { 
                categoriesToStack = titles;
            }

            seriesData = categoriesToStack.map(category => {
                return {
                    name: category,
                    type: 'bar',
                    stack: 'total', 
                    emphasis: { focus: 'series' },
                    label: {
                        show: valueType === 'percentage',
                        position: 'inside',
                        formatter: function(params) {
                            return parseFloat(params.value) > 5 ? parseFloat(params.value).toFixed(1) + '%' : '';
                        },
                        color: '#fff',
                        fontSize: 9
                    },
                    data: rawData.map(d => {
                        const regionTotalForCategories = categoriesToStack.reduce((sum, cat) => sum + (d[cat] || 0), 0);
                        if (valueType === 'percentage') {
                            return regionTotalForCategories > 0 ? parseFloat(((d[category] || 0) / regionTotalForCategories * 100).toFixed(2)) : 0;
                        }
                        return d[category] || 0;
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
                            let displayValue;
                            const regionData = rawData.find(r => r['地区'] === item.name);
                            const rawCount = (regionData && regionData[item.seriesName] !== undefined) ? (regionData[item.seriesName] || 0) : 0;

                            if (valueType === 'percentage') {
                                displayValue = val.toFixed(2) + `% (${rawCount.toLocaleString()}人)`;
                            } else {
                                displayValue = val.toLocaleString() + '人';
                            }
                            tooltipStr += `${item.marker} ${item.seriesName}: ${displayValue}<br/>`;
                        });
                         if (valueType === 'absolute' && params.length > 0) {
                             const totalForRegionInCategories = categoriesToStack.reduce((s, cat) => s + (rawData.find(r => r['地区'] === params[0].name)[cat] || 0), 0);
                            tooltipStr += `<strong>当前分类总计: ${totalForRegionInCategories.toLocaleString()}人</strong>`;
                        }
                        return tooltipStr;
                    }
                },
                legend: { data: categoriesToStack, bottom: 10, type: 'scroll' },
                grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
                xAxis: { type: 'category', data: regions, axisLabel: { interval: 0, rotate: 30, fontSize:10 } },
                yAxis: { 
                    type: 'value', 
                    name: valueType === 'percentage' ? '占比 (%)' : '教师数量 (人)',
                    axisLabel: { formatter: valueType === 'percentage' ? '{value}%' : '{value}' },
                    max: valueType === 'percentage' ? 100 : null
                },
                series: seriesData
            };
            teacherStructureChart.setOption(option, true);
            
            if (teacherPieRegionSelect.value) {
                updatePieCharts(teacherPieRegionSelect.value);
            } else if (allRegionsForPies.length > 0) {
                updatePieCharts(allRegionsForPies[0]);
            } else {
                 updatePieCharts(null); // Explicitly update with no region if none are available
            }
        }

        function updatePieCharts(regionName) {
            // Ensure pie chart instances are (re)initialized if necessary
            if (educationPieDom && (!teacherEducationPieChart || teacherEducationPieChart.isDisposed())) {
                teacherEducationPieChart = echarts.init(educationPieDom);
                window.teacherEducationPieChart = teacherEducationPieChart;
            }
            if (titlePieDom && (!teacherTitlePieChart || teacherTitlePieChart.isDisposed())) {
                teacherTitlePieChart = echarts.init(titlePieDom);
                window.teacherTitlePieChart = teacherTitlePieChart;
            }

            const showPlaceholder = (chartInstance, message) => {
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
                }
            };

            if (rawData.length === 0 || !regionName || regionName === 'all') {
                showPlaceholder(teacherEducationPieChart, "请选择一个地区查看学历构成饼图");
                showPlaceholder(teacherTitlePieChart, "请选择一个地区查看职称构成饼图");
                return;
            }

            const regionData = rawData.find(d => d['地区'] === regionName);
            console.log(`Updating pie charts for region: ${regionName}`, regionData);

            if (!regionData) {
                showPlaceholder(teacherEducationPieChart, `无“${regionName}”地区的学历数据`);
                showPlaceholder(teacherTitlePieChart, `无“${regionName}”地区的职称数据`);
                return;
            }

            // Education Pie Chart
            if (teacherEducationPieChart && !teacherEducationPieChart.isDisposed()) {
                const educationPieData = educationLevels.map(level => ({
                    name: level,
                    value: regionData[level] || 0
                })).filter(d => d.value > 0);

                if (educationPieData.length > 0) {
                    const educationPieOption = {
                        title: { text: `${regionName} - 学历构成`, left: 'center', textStyle: { fontSize: 14 } },
                        tooltip: { trigger: 'item', formatter: '{a} <br/>{b} : {c}人 ({d}%)' },
                        legend: { orient: 'vertical', left: 10, top: 30, data: educationPieData.map(d => d.name), type:'scroll' },
                        series: [{
                            name: '学历构成', type: 'pie', radius: ['40%', '65%'], center: ['55%', '55%'], data: educationPieData,
                            emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' } },
                            label: { show: true, formatter: '{b}\n{d}%', fontSize: 10 }, labelLine: { show: true }
                        }]
                    };
                    teacherEducationPieChart.setOption(educationPieOption, true);
                } else {
                    showPlaceholder(teacherEducationPieChart, `“${regionName}”地区无有效学历数据`);
                }
                teacherEducationPieChart.resize(); 
            }


            // Title Pie Chart
            if (teacherTitlePieChart && !teacherTitlePieChart.isDisposed()) {
                const titlePieData = titles.map(title => ({
                    name: title,
                    value: regionData[title] || 0
                })).filter(d => d.value > 0);

                if (titlePieData.length > 0) {
                    const titlePieOption = {
                        title: { text: `${regionName} - 职称构成`, left: 'center', textStyle: { fontSize: 14 } },
                        tooltip: { trigger: 'item', formatter: '{a} <br/>{b} : {c}人 ({d}%)' },
                        legend: { orient: 'vertical', left: 10, top: 30, data: titlePieData.map(d => d.name), type:'scroll' },
                        series: [{
                            name: '职称构成', type: 'pie', radius: ['40%', '65%'], center: ['55%', '55%'], data: titlePieData,
                            emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' } },
                            label: { show: true, formatter: '{b}\n{d}%', fontSize: 10 }, labelLine: { show: true }
                        }]
                    };
                    teacherTitlePieChart.setOption(titlePieOption, true);
                } else {
                    showPlaceholder(teacherTitlePieChart, `“${regionName}”地区无有效职称数据`);
                }
                teacherTitlePieChart.resize(); 
            }
        }

        if (await loadData()) {
            updateChart(); // This will also call updatePieCharts for the initially selected region
            stackBySelect.addEventListener('change', updateChart);
            valueTypeSelect.addEventListener('change', updateChart);
            if (teacherPieRegionSelect) {
                teacherPieRegionSelect.addEventListener('change', (e) => updatePieCharts(e.target.value));
            }

            document.addEventListener('globalRegionChanged', (event) => {
                const teacherView = document.getElementById('teacher-structure-view');
                if (teacherView && teacherView.classList.contains('active-view')) {
                    const selectedRegion = event.detail.region;
                    
                    if (teacherStructureChart && !teacherStructureChart.isDisposed()) {
                        teacherStructureChart.dispatchAction({ type: 'downplay' });
                        if (selectedRegion && selectedRegion !== 'all') {
                            const dataIndex = rawData.findIndex(item => item['地区'] === selectedRegion);
                            if (dataIndex !== -1) {
                                teacherStructureChart.dispatchAction({ type: 'highlight', seriesIndex: 0, dataIndex: dataIndex });
                            }
                        }
                    }

                    if (allRegionsForPies.includes(selectedRegion) && selectedRegion !== 'all') {
                        if (teacherPieRegionSelect) teacherPieRegionSelect.value = selectedRegion;
                        updatePieCharts(selectedRegion);
                    } else if (selectedRegion === 'all' && allRegionsForPies.length > 0) {
                        // Optionally update pie charts to the first region or show a general placeholder
                        if (teacherPieRegionSelect) teacherPieRegionSelect.value = allRegionsForPies[0];
                        updatePieCharts(allRegionsForPies[0]); // Or updatePieCharts(null) for placeholder
                    } else {
                        updatePieCharts(null); // Show placeholder if region is not in pie data or 'all' is selected without a default
                    }
                }
            });
        }
    };
});