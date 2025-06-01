document.addEventListener('DOMContentLoaded', async () => {
    const mapDom = document.getElementById('main-map-container');
    if (!mapDom) {
        console.error("全局地图容器 'main-map-container' 未找到!");
        return;
    }
    const mainMapChart = echarts.init(mapDom);

    // 地图主要交互控件的DOM引用
    const mapMetricSelect = document.getElementById('map-metric-select');
    const mapRegionSelect = document.getElementById('map-region-select');

    // 地图各指标范围筛选滑块的DOM引用
    const mapExpenditureMinInput = document.getElementById('map-expenditure-filter-min');
    const mapExpenditureMaxInput = document.getElementById('map-expenditure-filter-max');
    const mapExpenditureRangeDisplay = document.getElementById('map-expenditure-range-display');

    const mapTier1RateMinInput = document.getElementById('map-tier1rate-filter-min');
    const mapTier1RateMaxInput = document.getElementById('map-tier1rate-filter-max');
    const mapTier1RateRangeDisplay = document.getElementById('map-tier1rate-range-display');

    const mapKeySchoolMinInput = document.getElementById('map-keyschool-filter-min');
    const mapKeySchoolMaxInput = document.getElementById('map-keyschool-filter-max');
    const mapKeySchoolRangeDisplay = document.getElementById('map-keyschool-range-display');

    const mapTsRatioMinInput = document.getElementById('map-tsratio-filter-min');
    const mapTsRatioMaxInput = document.getElementById('map-tsratio-filter-max');
    const mapTsRatioRangeDisplay = document.getElementById('map-tsratio-range-display');

    const mapHigherEdRateMinInput = document.getElementById('map-higheredrate-filter-min');
    const mapHigherEdRateMaxInput = document.getElementById('map-higheredrate-filter-max');
    const mapHigherEdRateRangeDisplay = document.getElementById('map-higheredrate-range-display');

    let mapRawData = []; // 存储从CSV加载和解析后的原始数据
    let allMapRegions = []; // 存储所有地区名称列表

    // CSV中的地区名到GeoJSON地图特性名的映射
    const regionNameMap = {
        "山东": "山东省", "江苏": "江苏省", "广东": "广东省", "河北": "河北省",
        "福建": "福建省", "湖北": "湖北省", "湖南": "湖南省", "海南": "海南省",
        "辽宁": "辽宁省", "重庆": "重庆市", "北京": "北京市", "天津": "天津市",
        "浙江": "浙江省", "上海": "上海市", "河南": "河南省", "安徽": "安徽省",
        "江西": "江西省", "山西": "山西省", "陕西": "陕西省", "黑龙江": "黑龙江省",
        "吉林": "吉林省", "甘肃": "甘肃省", "内蒙古": "内蒙古自治区",
        "青海": "青海省", "宁夏": "宁夏回族自治区", "四川": "四川省",
        "云南": "云南省", "广西": "广西壮族自治区", "贵州": "贵州省",
        "西藏": "西藏自治区", "新疆": "新疆维吾尔自治区"
    };

    // 获取CSV地区名对应的GeoJSON地图地区名
    function getGeoMapRegionName(csvRegionName) { return regionNameMap[csvRegionName] || csvRegionName; }

    // 格式化指标值，用于Tooltip显示或数据处理
    function formatMetricValue(value, metricName, forDisplay = true) {
        if (value === null || typeof value === 'undefined' || (typeof value === 'number' && isNaN(value)) ) {
            return forDisplay ? '无数据' : null;
        }
        // 确保处理的是数字或可转换为数字的字符串
        if (typeof value !== 'number' && typeof value !== 'string') return String(value);

        let numValue = typeof value === 'string' ? parseFloat(value.replace('%','')) : value;
        // 处理空字符串解析为NaN的情况
        if (isNaN(numValue) && typeof value === 'string' && value.trim() === '') return forDisplay ? '无数据' : null;
        // 如果解析失败但原始值非空，则返回原始值(forDisplay为true时)或解析尝试值(forDisplay为false时)
        if (isNaN(numValue)) return forDisplay ? String(value) : value; 

        const percentageMetrics = ["一本率", "重点中学比例", "高等学校入学率"];
        if (percentageMetrics.includes(metricName)) {
            return numValue.toFixed(2) + (forDisplay ? '%' : '');
        }
        if (metricName === "师生比") {
            return numValue.toFixed(2); // 师生比通常保留两位小数
        }
        // 其他数值型指标，如经费合计
        return forDisplay ? numValue.toLocaleString() : numValue; 
    }

    // 异步加载地图GeoJSON和CSV数据
    async function loadMapData() {
        try {
            const geoJsonResponse = await fetch('data/china.json');
            if (!geoJsonResponse.ok) throw new Error(`地图GeoJSON加载失败: ${geoJsonResponse.statusText}`);
            const chinaGeoJson = await geoJsonResponse.json();
            echarts.registerMap('china', chinaGeoJson);
            console.log("全局地图: GeoJSON 'china' 注册成功");

            const csvResponse = await fetch('data/all_data.csv');
            if (!csvResponse.ok) throw new Error(`地图CSV(all_data.csv)加载失败: ${csvResponse.statusText}`);
            const csvText = await csvResponse.text();
            const lines = csvText.trim().split('\n');
            const headersLine = lines[0];
            if (!headersLine) throw new Error("地图CSV(all_data.csv)为空或无表头。");
            
            const headers = headersLine.split(',').map(h => h.trim().replace(/^[\ufeff]/, '')); // 移除BOM并trim表头

            mapRawData = lines.slice(1).map(line => {
                const values = line.split(',').map(v => v.trim());
                if (values.length < headers.length) return null; // 数据列数不足，此行作废
                const obj = {};
                headers.forEach((header, i) => {
                    const val = values[i];
                    const isEmpty = (val === '' || val === null || typeof val === 'undefined');
                    
                    if (header === '地区') {
                        obj['地区'] = val;
                        obj['mapName'] = getGeoMapRegionName(val);
                    } else if (['一本率', '重点中学比例', '高等学校入学率'].includes(header)) {
                        obj[header] = isEmpty ? null : parseFloat(val.replace('%', ''));
                    } else if (header === '师生比') {
                        obj[header] = isEmpty ? null : parseFloat(val);
                    } else if (header === '教育经费合计') {
                        obj[header] = isEmpty ? null : Number(val);
                    } else {
                        obj[header.replace(/\s/g, '_')] = val; // 其他列直接存储或按需处理
                    }
                });
                return obj;
            }).filter(d => d && d['地区']); // 确保数据对象有效且有地区名

            allMapRegions = Array.from(new Set(mapRawData.map(d => d['地区']))).sort();
            console.log("全局地图: all_data.csv 数据加载处理完毕", mapRawData.length);
            return true;
        } catch (error) {
            console.error("全局地图数据加载或处理失败:", error);
            if (mapDom) mapDom.innerHTML = `<p style="color:red;">全局地图数据错误: ${error.message}</p>`;
            return false;
        }
    }

    // 更新滑块旁边的范围显示文本
    function updateGlobalMapRangeDisplays() {
        const updateDisplay = (minInput, maxInput, displaySpan, unit = '', isPercent = false) => {
            if (minInput && maxInput && displaySpan) {
                const minVal = Number(minInput.value);
                const maxVal = Number(maxInput.value);
                // 使用 formatMetricValue 进行格式化以保持一致性，但需注意 metricName 参数
                // 为简化，此处对百分比和普通数值做区分处理
                const minText = isPercent ? minVal.toFixed(1) + '%' : parseFloat(minVal).toLocaleString(); 
                const maxText = isPercent ? maxVal.toFixed(1) + '%' : parseFloat(maxVal).toLocaleString();
                displaySpan.textContent = `${minText} - ${maxText}${unit}`;
            }
        };

        updateDisplay(mapExpenditureMinInput, mapExpenditureMaxInput, mapExpenditureRangeDisplay, ' 元');
        updateDisplay(mapTier1RateMinInput, mapTier1RateMaxInput, mapTier1RateRangeDisplay, '', true);
        updateDisplay(mapKeySchoolMinInput, mapKeySchoolMaxInput, mapKeySchoolRangeDisplay, '', true);
        updateDisplay(mapTsRatioMinInput, mapTsRatioMaxInput, mapTsRatioRangeDisplay); 
        updateDisplay(mapHigherEdRateMinInput, mapHigherEdRateMaxInput, mapHigherEdRateRangeDisplay, '', true);
    }

    // 初始化单个滑块的min/max属性和当前value
    function initializeSlider(minInput, maxInput, dataKey, isPercentage = false, defaultMin = 0, defaultMax = 100) {
        if (!minInput || !maxInput) { // 确保DOM元素存在
             console.warn(`滑块 ${dataKey} 的 DOM 元素未完全找到。`);
             if(minInput) { minInput.min = defaultMin; minInput.max = defaultMax; minInput.value = defaultMin;}
             if(maxInput) { maxInput.min = defaultMin; maxInput.max = defaultMax; maxInput.value = defaultMax;}
            return;
        }
        if (mapRawData.length === 0) { // 如果没有数据，则使用默认范围
            minInput.min = defaultMin; minInput.max = defaultMax; minInput.value = defaultMin;
            maxInput.min = defaultMin; maxInput.max = defaultMax; maxInput.value = defaultMax;
            return;
        }

        const values = mapRawData.map(d => d[dataKey]).filter(v => v !== null && !isNaN(v) && typeof v === 'number');
        
        let dataMin, dataMax;

        if (isPercentage) {
            minInput.min = 0; minInput.max = 100; // HTML属性范围
            maxInput.min = 0; maxInput.max = 100;
            dataMin = values.length > 0 ? Math.floor(Math.min(...values)) : 0;
            dataMax = values.length > 0 ? Math.ceil(Math.max(...values)) : 100;
            minInput.value = Math.max(0, Math.min(100, dataMin)); // 滑块当前值
            maxInput.value = Math.max(0, Math.min(100, dataMax));
        } else {
            dataMin = values.length > 0 ? Math.min(...values) : defaultMin;
            dataMax = values.length > 0 ? Math.max(...values) : defaultMax;
            
            if (dataMin === dataMax) { // 处理数据集中所有值相同的情况
                if (dataMin !== 0) {
                    dataMin *= 0.9; // 稍微扩大范围以便拖动
                    dataMax *= 1.1;
                } else { // 如果都是0
                    dataMax = defaultMax || 1; // 避免0-0范围
                }
            }
            minInput.min = dataMin; minInput.max = dataMax;
            maxInput.min = dataMin; maxInput.max = dataMax;
            minInput.value = dataMin;
            maxInput.value = dataMax;
        }
        // 确保min slider value不大于max slider value
        if (Number(minInput.value) > Number(maxInput.value)) {
            maxInput.value = minInput.value;
        }
    }

    // 填充地图控制区域的下拉框选项并初始化滑块
    function populateMapControls() {
        if (!mapRegionSelect || !mapMetricSelect) return;

        // 填充地区选择下拉框
        mapRegionSelect.innerHTML = '<option value="all">所有地区</option>';
        allMapRegions.forEach(region => {
            const option = document.createElement('option');
            option.value = region; option.textContent = region;
            mapRegionSelect.appendChild(option);
        });

        // 定义可选的地图着色指标
        const availableMetricsForMap = [
            { value: '教育经费合计', text: '教育经费合计 (元)' },
            { value: '一本率', text: '一本率 (%)' }, 
            { value: '重点中学比例', text: '重点中学比例 (%)' },
            { value: '师生比', text: '师生比' }, 
            { value: '高等学校入学率', text: '高等学校入学率 (%)' }
        ];
        mapMetricSelect.innerHTML = ''; // 清空现有选项
        availableMetricsForMap.forEach(metricInfo => {
            // 确保该指标在数据中至少有一个有效数值才添加到下拉框
            if (mapRawData.some(d => d[metricInfo.value] !== null && !isNaN(d[metricInfo.value]))) {
                const option = document.createElement('option');
                option.value = metricInfo.value; option.textContent = metricInfo.text;
                mapMetricSelect.appendChild(option);
            }
        });
        if (mapMetricSelect.options.length > 0) {
            mapMetricSelect.value = mapMetricSelect.options[0].value; // 默认选中第一个可用指标
        }

        // 初始化所有筛选滑块
        initializeSlider(mapExpenditureMinInput, mapExpenditureMaxInput, '教育经费合计', false, 0, 1000000000); // 经费默认范围较大
        initializeSlider(mapTier1RateMinInput, mapTier1RateMaxInput, '一本率', true, 0, 100);
        initializeSlider(mapKeySchoolMinInput, mapKeySchoolMaxInput, '重点中学比例', true, 0, 100);
        initializeSlider(mapTsRatioMinInput, mapTsRatioMaxInput, '师生比', false, 5, 30); // 师生比参考范围
        initializeSlider(mapHigherEdRateMinInput, mapHigherEdRateMaxInput, '高等学校入学率', true, 0, 100);
        
        updateGlobalMapRangeDisplays(); // 更新滑块范围的文本显示
    }

    // 更新全局地图的显示
    function updateGlobalMap() {
        if (mapRawData.length === 0 || !mapMetricSelect || mapMetricSelect.options.length === 0) {
            if(mainMapChart && !mainMapChart.isDisposed()) mainMapChart.clear();
            mapDom.innerHTML = `<p style="text-align:center; padding-top:50px;">地图无有效数据或指标可供显示</p>`;
            return;
        }

        const selectedMetricToColor = mapMetricSelect.value; // 当前选中的着色指标
        const selectedRegionToHighlight = mapRegionSelect.value; // 当前选中的高亮地区

        // 从滑块获取当前的筛选范围
        const filters = {
            '教育经费合计': [Number(mapExpenditureMinInput?.value), Number(mapExpenditureMaxInput?.value)],
            '一本率': [Number(mapTier1RateMinInput?.value), Number(mapTier1RateMaxInput?.value)],
            '重点中学比例': [Number(mapKeySchoolMinInput?.value), Number(mapKeySchoolMaxInput?.value)],
            '师生比': [Number(mapTsRatioMinInput?.value), Number(mapTsRatioMaxInput?.value)],
            '高等学校入学率': [Number(mapHigherEdRateMinInput?.value), Number(mapHigherEdRateMaxInput?.value)]
        };
        // 为filter的max值设置一个非常大的数，如果滑块本身没有值或解析为0/NaN (针对非百分比)
        if (isNaN(filters['教育经费合计'][1]) || filters['教育经费合计'][1] === 0 ) filters['教育经费合计'][1] = Infinity;
        if (isNaN(filters['师生比'][1]) || filters['师生比'][1] === 0 ) filters['师生比'][1] = Infinity;


        // 根据所有滑块的范围筛选数据
        const filteredDataForMapDisplay = mapRawData.filter(d => {
            for (const key in filters) {
                if (d[key] === null || typeof d[key] === 'undefined' || isNaN(d[key])) { // 跳过空值或NaN值数据点的该项筛选
                    continue; 
                }
                const val = d[key];
                const [min, max] = filters[key];
                // 确保min和max是有效数字，否则不应用此项筛选
                if (isNaN(min) || isNaN(max)) continue; 
                if (val < min || val > max) return false; 
            }
            return true;
        });
        
        // 准备ECharts地图系列所需的数据格式
        const chartDataForMap = filteredDataForMapDisplay.map(d => ({
            name: d.mapName, // 使用映射后的GeoJSON地区名
            value: d[selectedMetricToColor], // 当前着色指标的值
            allData: d // 保留完整数据以便tooltip显示
        })).filter(d => d.value !== null && !isNaN(d.value)); // 确保着色值有效
        
        // 计算visualMap的min/max范围
        let minVal = 0, maxVal = 100; // 默认范围，尤其适用于百分比
        if (chartDataForMap.length > 0) {
            const values = chartDataForMap.map(d => d.value);
            minVal = Math.min(...values);
            maxVal = Math.max(...values);
        } else { 
            // 如果筛选后无数据，则尝试基于原始数据（未筛选）的当前指标计算范围
            const originalValuesForMetric = mapRawData.map(d => d[selectedMetricToColor]).filter(v => v !== null && !isNaN(v));
            if (originalValuesForMetric.length > 0) {
                minVal = Math.min(...originalValuesForMetric);
                maxVal = Math.max(...originalValuesForMetric);
            } else { // 如果连原始数据都没有该指标，则使用默认或猜测范围
                minVal = 0; 
                maxVal = (selectedMetricToColor.includes("率") || selectedMetricToColor.includes("比例")) ? 100 : (selectedMetricToColor === "教育经费合计" ? 100000000 : 30);
            }
        }

        // 避免visualMap的min和max相等导致渲染问题
        if (minVal === maxVal) {
            if (minVal === 0) maxVal = 1; // 如果都是0，则设为0-1
            else { minVal *= 0.9; maxVal *= 1.1; } // 稍微扩展范围
        }
        if (minVal > maxVal) { // 确保 min <= max
            [minVal, maxVal] = [maxVal, minVal]; // Swap if min > max
            if (minVal === maxVal) maxVal = minVal +1; // 再次确保不相等
        }


        const mapOption = {
            title: { text: `各地区${selectedMetricToColor}概览`, left: 'center', textStyle: { fontSize: 16 } },
            tooltip: { 
                trigger: 'item', 
                formatter: params => {
                    if (params.data && params.data.allData) {
                        const d = params.data.allData;
                        let tooltipHtml = `<strong>地区: ${d['地区']}</strong><br/>`;
                        // 从availableMetricsForMap获取顺序和名称，确保tooltip显示所有主要指标
                        availableMetricsForMap.forEach(metric => {
                             tooltipHtml += `${metric.text.split(' (')[0]}: ${formatMetricValue(d[metric.value], metric.value)} ${metric.text.includes('(元)') ? '元' : ''}<br/>`;
                        });
                        return tooltipHtml;
                    }
                    // 如果没有数据（例如该地区被筛选掉，或GeoJSON中存在但CSV中没有的地区）
                    return `${params.name}<br/>(${selectedMetricToColor}) 无有效数据`;
                }
            },
            visualMap: {
                min: minVal, max: maxVal, left: '5%', bottom: '5%',
                text: [`高 (${formatMetricValue(maxVal, selectedMetricToColor, true)})`, `低 (${formatMetricValue(minVal, selectedMetricToColor, true)})`], 
                calculable: true,
                inRange: { color: ['#E6F7FF', '#BAE7FF', '#91D5FF', '#69C0FF', '#40A9FF', '#1890FF', '#096DD9'].reverse() },
                itemWidth: 15, itemHeight: 80, textStyle: { fontSize: 10 }
            },
            geo: { 
                map: 'china', 
                roam: true, // 允许缩放和拖拽
                label: { show: false }, // 默认不显示地区标签
                emphasis: { // 高亮状态
                    label: { show: true, color: '#333', fontWeight: 'bold' }, 
                    itemStyle: { areaColor: '#FFD700', shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.2)' } 
                }, 
                itemStyle: { // 正常状态
                    areaColor: '#f3f3f3', borderColor: '#aaa', borderWidth: 0.5 
                },
                selectedMode: 'single', // 允许单选高亮
                select: { // 选中状态
                    label: { show: true, color: '#fff' }, //选中时标签白色
                    itemStyle: { areaColor: '#c00000' } // 选中时区域深红色
                }
            },
            series: [{ 
                name: selectedMetricToColor, 
                type: 'map', 
                geoIndex: 0, //关联到第一个geo组件
                data: chartDataForMap 
            }]
        };
        if(mainMapChart && !mainMapChart.isDisposed()){
            mainMapChart.setOption(mapOption, true); // true表示不合并，清除之前的配置
        }
        

        // 处理地图区域高亮和选中状态
        if(mainMapChart && !mainMapChart.isDisposed()){
            mainMapChart.dispatchAction({ type: 'downplay' }); // 先取消所有高亮/选中
            if (selectedRegionToHighlight !== 'all') {
                const geoRegionName = getGeoMapRegionName(selectedRegionToHighlight);
                mainMapChart.dispatchAction({ type: 'highlight', seriesIndex: 0, name: geoRegionName });
                mainMapChart.dispatchAction({ type: 'select', seriesIndex: 0, name: geoRegionName });
                mainMapChart.dispatchAction({ type: 'showTip', seriesIndex: 0, name: geoRegionName }); // 触发选中地区的tooltip
            } else {
                // 如果选择 "所有地区"，确保取消任何已选中的区域
                // 'unselect' 需要指定之前选中的name，或者更简单的方式是重新设置一个空的选中项
                // 但由于selectedMode: 'single', downplay应该已经处理了大部分
                // 如果仍有问题，可以遍历所有地区进行unselect，或者记录上次选中的项
            }
        }
    }

    // 整体初始化流程
    async function initGlobalMap() {
        if(mainMapChart && !mainMapChart.isDisposed()){
            mainMapChart.showLoading({ text: '全局地图数据加载中...' });
        }
        const dataLoaded = await loadMapData();
        if(mainMapChart && !mainMapChart.isDisposed()){
            mainMapChart.hideLoading();
        }
        

        if (dataLoaded && mapRawData.length > 0) {
            populateMapControls(); // 填充控件
            updateGlobalMap();     // 首次渲染地图

            // 绑定事件监听器
            if(mapMetricSelect) mapMetricSelect.addEventListener('change', updateGlobalMap);
            if(mapRegionSelect) mapRegionSelect.addEventListener('change', updateGlobalMap);

            const allSliderInputs = [
                mapExpenditureMinInput, mapExpenditureMaxInput,
                mapTier1RateMinInput, mapTier1RateMaxInput,
                mapKeySchoolMinInput, mapKeySchoolMaxInput,
                mapTsRatioMinInput, mapTsRatioMaxInput,
                mapHigherEdRateMinInput, mapHigherEdRateMaxInput
            ];
            allSliderInputs.forEach(input => {
                if (input) {
                    input.addEventListener('input', () => { // 'input'事件实时响应滑块拖动
                        updateGlobalMapRangeDisplays(); // 实时更新范围文本
                        // updateGlobalMap(); // 实时更新地图，如果性能允许
                    });
                    input.addEventListener('change', () => { // 'change'事件在释放滑块后触发
                        updateGlobalMap(); // 在滑块操作结束后更新地图，性能更优
                    });
                }
            });

            // 窗口大小调整时重绘图表
            window.addEventListener('resize', () => {
                if (mainMapChart && !mainMapChart.isDisposed()) mainMapChart.resize();
            });
        } else if (dataLoaded && mapRawData.length === 0) {
            mapDom.innerHTML = `<p style="text-align:center; padding-top:50px;">全局地图数据已加载，但内容为空或不符合预期格式。</p>`;
        }
        // 如果dataLoaded为false，错误信息已在loadMapData中显示
    }

    initGlobalMap(); // 执行初始化
});