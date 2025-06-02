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

    function getGeoMapRegionName(csvRegionName) { return regionNameMap[csvRegionName] || csvRegionName; }

    // 格式化指标值，用于Tooltip显示或数据处理
    function formatMetricValue(value, metricName, forDisplay = true) {
        if (value === null || typeof value === 'undefined' || (typeof value === 'number' && isNaN(value)) ) {
            return forDisplay ? '无数据' : null;
        }
        if (typeof value !== 'number' && typeof value !== 'string') return String(value);

        let numValue = typeof value === 'string' ? parseFloat(value.replace('%','')) : value;
        if (isNaN(numValue) && typeof value === 'string' && value.trim() === '') return forDisplay ? '无数据' : null;
        if (isNaN(numValue)) return forDisplay ? String(value) : value; 

        const percentageMetrics = ["一本率", "重点中学比例", "高等教育毛入学率"];
        if (percentageMetrics.includes(metricName)) {
            return numValue.toFixed(2) + (forDisplay ? '%' : '');
        }
        if (metricName === "师生比") {
            return numValue.toFixed(2);
        }
        return forDisplay ? numValue.toLocaleString() : numValue; 
    }

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
            
            const headers = headersLine.split(',').map(h => h.trim().replace(/^[\ufeff]/, '')); // 移除BOM

            mapRawData = lines.slice(1).map(line => {
                const values = line.split(',').map(v => v.trim());
                if (values.length < headers.length) return null; // 数据列数不足
                const obj = {};
                headers.forEach((header, i) => {
                    const val = values[i];
                    const isEmpty = (val === '' || val === null || typeof val === 'undefined');
                    
                    if (header === '地区') {
                        obj['地区'] = val;
                        obj['mapName'] = getGeoMapRegionName(val);
                    } else if (['一本率', '重点中学比例', '高等教育毛入学率'].includes(header)) {
                        obj[header] = isEmpty ? null : parseFloat(val.replace('%', ''));
                    } else if (header === '师生比') {
                        obj[header] = isEmpty ? null : parseFloat(val);
                    } else if (header === '教育经费合计') {
                        obj[header] = isEmpty ? null : Number(val);
                    } else {
                        obj[header.replace(/\s/g, '_')] = val;
                    }
                });
                return obj;
            }).filter(d => d && d['地区']); // 确保数据有效且有地区名

            allMapRegions = Array.from(new Set(mapRawData.map(d => d['地区']))).sort();
            window.mapRawData = mapRawData; // 使其对其他JS模块可用
            window.allMapRegions = allMapRegions;
            console.log("全局地图: all_data.csv 数据加载处理完毕", mapRawData.length);
            
            const event = new CustomEvent('mapDataReady', { 
                detail: { mapRawData: mapRawData, allMapRegions: allMapRegions } 
            });
            document.dispatchEvent(event);
            console.log("全局地图: 'mapDataReady' 事件已派发。");
            return true;
        } catch (error) {
            console.error("全局地图数据加载或处理失败:", error);
            if (mapDom) mapDom.innerHTML = `<p style="color:red;">全局地图数据错误: ${error.message}</p>`;
            const errorEvent = new CustomEvent('mapDataFailed', { detail: { error: error } });
            document.dispatchEvent(errorEvent);
            return false;
        }
    }

    function updateGlobalMapRangeDisplays() {
        const updateDisplay = (minInput, maxInput, displaySpan, unit = '', isPercent = false) => {
            if (minInput && maxInput && displaySpan) {
                const minVal = Number(minInput.value);
                const maxVal = Number(maxInput.value);
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

    function initializeSlider(minInput, maxInput, dataKey, isPercentage = false, defaultMin = 0, defaultMax = 100) {
        if (!minInput || !maxInput) {
             console.warn(`滑块 ${dataKey} 的 DOM 元素未完全找到。`);
             if(minInput) { minInput.min = defaultMin; minInput.max = defaultMax; minInput.value = defaultMin;}
             if(maxInput) { maxInput.min = defaultMin; maxInput.max = defaultMax; maxInput.value = defaultMax;}
            return;
        }
        if (mapRawData.length === 0) {
            minInput.min = defaultMin; minInput.max = defaultMax; minInput.value = defaultMin;
            maxInput.min = defaultMin; maxInput.max = defaultMax; maxInput.value = defaultMax;
            return;
        }

        const values = mapRawData.map(d => d[dataKey]).filter(v => v !== null && !isNaN(v) && typeof v === 'number');
        let dataMin, dataMax;

        if (isPercentage) {
            minInput.min = 0; minInput.max = 100;
            maxInput.min = 0; maxInput.max = 100;
            dataMin = values.length > 0 ? Math.floor(Math.min(...values)) : 0;
            dataMax = values.length > 0 ? Math.ceil(Math.max(...values)) : 100;
            minInput.value = Math.max(0, Math.min(100, dataMin));
            maxInput.value = Math.max(0, Math.min(100, dataMax));
        } else {
            dataMin = values.length > 0 ? Math.min(...values) : defaultMin;
            dataMax = values.length > 0 ? Math.max(...values) : defaultMax;
            
            if (dataMin === dataMax) { // 处理数据集中所有值相同的情况
                if (dataMin !== 0) { dataMin *= 0.9; dataMax *= 1.1; } 
                else { dataMax = defaultMax || 1; } // 避免0-0范围
            }
            minInput.min = dataMin; minInput.max = dataMax;
            maxInput.min = dataMin; maxInput.max = dataMax;
            minInput.value = dataMin;
            maxInput.value = dataMax;
        }
        if (Number(minInput.value) > Number(maxInput.value)) {
            maxInput.value = minInput.value;
        }
    }

    function populateMapControls() {
        if (!mapRegionSelect || !mapMetricSelect) return;

        mapRegionSelect.innerHTML = '<option value="all">所有地区</option>';
        allMapRegions.forEach(region => {
            const option = document.createElement('option');
            option.value = region; option.textContent = region;
            mapRegionSelect.appendChild(option);
        });

        const availableMetricsForMap = [
            { value: '教育经费合计', text: '教育经费合计 (元)' },
            { value: '一本率', text: '一本率 (%)' }, 
            { value: '重点中学比例', text: '重点中学比例 (%)' },
            { value: '师生比', text: '师生比' }, 
            { value: '高等教育毛入学率', text: '高等教育毛入学率 (%)' }
        ];
        mapMetricSelect.innerHTML = '';
        availableMetricsForMap.forEach(metricInfo => {
            // 确保该指标在数据中至少有一个有效数值才添加到下拉框
            if (mapRawData.some(d => d[metricInfo.value] !== null && !isNaN(d[metricInfo.value]))) {
                const option = document.createElement('option');
                option.value = metricInfo.value; option.textContent = metricInfo.text;
                mapMetricSelect.appendChild(option);
            }
        });
        if (mapMetricSelect.options.length > 0) {
            mapMetricSelect.value = mapMetricSelect.options[0].value;
        }

        initializeSlider(mapExpenditureMinInput, mapExpenditureMaxInput, '教育经费合计', false, 0, 1000000000);
        initializeSlider(mapTier1RateMinInput, mapTier1RateMaxInput, '一本率', true, 0, 100);
        initializeSlider(mapKeySchoolMinInput, mapKeySchoolMaxInput, '重点中学比例', true, 0, 100);
        initializeSlider(mapTsRatioMinInput, mapTsRatioMaxInput, '师生比', false, 5, 30);
        initializeSlider(mapHigherEdRateMinInput, mapHigherEdRateMaxInput, '高等教育毛入学率', true, 0, 100);
        
        updateGlobalMapRangeDisplays();
    }

    function updateGlobalMap() {
        if (mapRawData.length === 0 || !mapMetricSelect || mapMetricSelect.options.length === 0) {
            if(mainMapChart && !mainMapChart.isDisposed()) mainMapChart.clear();
            mapDom.innerHTML = `<p style="text-align:center; padding-top:50px;">地图无有效数据或指标可供显示</p>`;
            return;
        }

        const selectedMetricToColor = mapMetricSelect.value;
        const selectedRegionToHighlight = mapRegionSelect.value;

        const filters = {
            '教育经费合计': [Number(mapExpenditureMinInput?.value), Number(mapExpenditureMaxInput?.value)],
            '一本率': [Number(mapTier1RateMinInput?.value), Number(mapTier1RateMaxInput?.value)],
            '重点中学比例': [Number(mapKeySchoolMinInput?.value), Number(mapKeySchoolMaxInput?.value)],
            '师生比': [Number(mapTsRatioMinInput?.value), Number(mapTsRatioMaxInput?.value)],
            '高等教育毛入学率': [Number(mapHigherEdRateMinInput?.value), Number(mapHigherEdRateMaxInput?.value)]
        };
        if (isNaN(filters['教育经费合计'][1]) || filters['教育经费合计'][1] === 0 ) filters['教育经费合计'][1] = Infinity;
        if (isNaN(filters['师生比'][1]) || filters['师生比'][1] === 0 ) filters['师生比'][1] = Infinity;

        const filteredDataForMapDisplay = mapRawData.filter(d => {
            for (const key in filters) {
                if (d[key] === null || typeof d[key] === 'undefined' || isNaN(d[key])) {
                    continue; 
                }
                const val = d[key];
                const [min, max] = filters[key];
                if (isNaN(min) || isNaN(max)) continue; 
                if (val < min || val > max) return false; 
            }
            return true;
        });
        
        const chartDataForMap = filteredDataForMapDisplay.map(d => ({
            name: d.mapName,
            value: d[selectedMetricToColor],
            allData: d 
        })).filter(d => d.value !== null && !isNaN(d.value)); // 确保着色值有效
        
        let minVal = 0, maxVal = 100; 
        if (chartDataForMap.length > 0) {
            const values = chartDataForMap.map(d => d.value);
            minVal = Math.min(...values);
            maxVal = Math.max(...values);
        } else { 
            const originalValuesForMetric = mapRawData.map(d => d[selectedMetricToColor]).filter(v => v !== null && !isNaN(v));
            if (originalValuesForMetric.length > 0) {
                minVal = Math.min(...originalValuesForMetric);
                maxVal = Math.max(...originalValuesForMetric);
            } else { 
                minVal = 0; 
                maxVal = (selectedMetricToColor.includes("率") || selectedMetricToColor.includes("比例")) ? 100 : (selectedMetricToColor === "教育经费合计" ? 100000000 : 30);
            }
        }

        if (minVal === maxVal) { // 避免visualMap的min和max相等
            if (minVal === 0) maxVal = 1;
            else { minVal *= 0.9; maxVal *= 1.1; }
        }
        if (minVal > maxVal) { 
            [minVal, maxVal] = [maxVal, minVal];
            if (minVal === maxVal) maxVal = minVal +1;
        }

        const mapOption = {
            title: { text: `各地区${selectedMetricToColor}概览`, left: 'center', textStyle: { fontSize: 16 } },
            tooltip: { 
                trigger: 'item', 
                formatter: params => {
                    if (params.data && params.data.allData) {
                        const d = params.data.allData;
                        let tooltipHtml = `<strong>地区: ${d['地区']}</strong><br/>`;
                        const availableMetricsForTooltip = [ // 和 populateMapControls 中保持一致或从那里引用
                            { value: '教育经费合计', text: '教育经费合计 (元)' }, { value: '一本率', text: '一本率 (%)' }, 
                            { value: '重点中学比例', text: '重点中学比例 (%)' }, { value: '师生比', text: '师生比' }, 
                            { value: '高等教育毛入学率', text: '高等教育毛入学率 (%)' }
                        ];
                        availableMetricsForTooltip.forEach(metric => {
                            tooltipHtml += `${metric.text.split(' (')[0]}: ${formatMetricValue(d[metric.value], metric.value)} ${metric.text.includes('(元)') ? '元' : ''}<br/>`;
                        });
                        return tooltipHtml;
                    }
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
                roam: true,
                label: { show: false }, 
                emphasis: { 
                    label: { show: true, color: '#333', fontWeight: 'bold' }, 
                    itemStyle: { areaColor: '#FFD700', shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.2)' } 
                }, 
                itemStyle: { 
                    areaColor: '#f3f3f3', borderColor: '#aaa', borderWidth: 0.5 
                },
                selectedMode: 'single',
                select: { 
                    label: { show: true, color: '#fff' }, 
                    itemStyle: { areaColor: '#c00000' } 
                }
            },
            series: [{ 
                name: selectedMetricToColor, 
                type: 'map', 
                geoIndex: 0, 
                data: chartDataForMap 
            }]
        };
        if(mainMapChart && !mainMapChart.isDisposed()){
            mainMapChart.setOption(mapOption, true); // true表示不合并，清除之前的配置
        }
        
        if(mainMapChart && !mainMapChart.isDisposed()){
            mainMapChart.dispatchAction({ type: 'downplay' }); 
            if (selectedRegionToHighlight !== 'all') {
                const geoRegionName = getGeoMapRegionName(selectedRegionToHighlight);
                mainMapChart.dispatchAction({ type: 'highlight', seriesIndex: 0, name: geoRegionName });
                mainMapChart.dispatchAction({ type: 'select', seriesIndex: 0, name: geoRegionName });
                mainMapChart.dispatchAction({ type: 'showTip', seriesIndex: 0, name: geoRegionName });
            }
        }
    }

    async function initGlobalMap() {
        if(mainMapChart && !mainMapChart.isDisposed()){
            mainMapChart.showLoading({ text: '全局地图数据加载中...' });
        }
        const dataLoaded = await loadMapData();
        if(mainMapChart && !mainMapChart.isDisposed()){
            mainMapChart.hideLoading();
        }
        
        if (dataLoaded && mapRawData.length > 0) {
            populateMapControls();
            updateGlobalMap();

            if(mapMetricSelect) mapMetricSelect.addEventListener('change', updateGlobalMap);
            if(mapRegionSelect) mapRegionSelect.addEventListener('change', updateGlobalMap);

            const allSliderInputs = [
                mapExpenditureMinInput, mapExpenditureMaxInput, mapTier1RateMinInput, mapTier1RateMaxInput,
                mapKeySchoolMinInput, mapKeySchoolMaxInput, mapTsRatioMinInput, mapTsRatioMaxInput,
                mapHigherEdRateMinInput, mapHigherEdRateMaxInput
            ];
            allSliderInputs.forEach(input => {
                if (input) {
                    input.addEventListener('input', () => { 
                        updateGlobalMapRangeDisplays();
                    });
                    input.addEventListener('change', () => { 
                        updateGlobalMap();
                    });
                }
            });

            window.addEventListener('resize', () => {
                if (mainMapChart && !mainMapChart.isDisposed()) mainMapChart.resize();
            });
        } else if (dataLoaded && mapRawData.length === 0) {
            mapDom.innerHTML = `<p style="text-align:center; padding-top:50px;">全局地图数据已加载，但内容为空或不符合预期格式。</p>`;
        }
    }

    initGlobalMap();
});