## 技术栈

* **HTML**: 用于构建网页的基本结构。
* **CSS**: 用于样式设计
* **JavaScript**: 用于实现网页的动态交互功能。
* **ECharts**: 一个强大的开源可视化库，用于绘制图表和图形。
* **CSV**: 数据存储格式，用于提供的数据。

## 项目结构

project/
├── index.html                  # 主页面
├── css/
│   └── style.css              # 样式文件
├── js/
│   └── chart1_scatter.js      # JavaScript 文件 网页和数据交互在这里实现
└── data/
└── enrollment_expenditure_part1.csv  # 数据放在这里

## 启动方式

1.在VSCode里下载名为 Live Server的扩展

2.右键index.html 点击 Open with Live Server

（正常点击index的话会因为 JS请求资源发起CORS跨域请求被限制，加载不出来数据，直接用VScode里的拓展配置会方便一点）
