# EasyJSON

一款轻量、快速、美观的桌面端 JSON 工具，基于 Electron + React + Vite 构建。

---

## 功能特性

### JSON 编辑器（中间区域）

- **语法高亮** - JSON 关键字、字符串、数字、布尔值等自动高亮
- **行号显示** - 左侧显示行号，方便定位
- **代码折叠** - 点击行号旁的箭头可折叠/展开对象和数组
- **自动缩进** - 粘贴压缩 JSON 后自动格式化为可读格式
- **括号匹配** - 自动匹配括号，输入时自动闭合
- **撤销/重做** - 支持 Ctrl+Z / Ctrl+Y
- **实时编辑** - 直接在编辑器中修改 JSON 内容，右侧树形视图实时同步

### JSON 树形视图（右侧区域）

- **树形结构展示** - 以树形方式展示 JSON 结构
- **展开/折叠** - 点击节点可展开或折叠子节点
- **Expand All / Collapse All** - 一键展开或折叠所有节点
- **搜索功能** - 支持按 key 和 value 搜索，匹配内容高亮显示
- **右键菜单**：
  - Edit Key - 编辑键名
  - Edit Value - 编辑值
  - Copy Key - 复制键名
  - Copy Value / Copy Object - 复制值或整个对象
  - Delete - 删除节点
- **双击编辑** - 双击 key 或 value 可直接内联编辑
- **值类型显示** - 字符串（绿色）、数字（浅绿）、布尔值（蓝色）、null（灰色）

### 历史记录面板（左侧区域）

- **自动保存** - 每次编辑自动保存到本地文件
- **历史列表** - 显示所有保存的 JSON 文档
- **快速切换** - 点击列表项快速切换文档
- **右键菜单**：
  - Rename - 重命名文档
  - Compare With - 与当前文档对比
  - Duplicate - 复制文档
  - Delete - 删除文档
- **显示信息** - 每个文档显示名称、时间（yyyy-MM-dd HH:mm:ss）、大小
- **持久化存储** - 关闭软件后重新打开，历史记录保留

### JSON 对比功能

- **点击工具栏 Compare 按钮** 打开对比窗口
- **左右双面板** - 左侧 JSON 1，右侧 JSON 2
- **自动对比** - 粘贴后自动对比（可关闭）
- **差异高亮** - 不同的行用绿色背景+左边框标记
- **同步滚动** - 左右面板同步滚动
- **导航功能** - 点击 ◀ / ▶ 跳转上一个/下一个差异
- **rootPath 模式**：
  - 关闭（默认）- 只比较 value，key 改变但 value 相同不算差异
  - 开启 - 比较路径+value，key 改变也算差异
- **ASCII 排序** - 对比前自动按键名 ASCII 码排序

### 工具栏

| 按钮 | 功能 |
|------|------|
| New | 新建空白文档 |
| Open | 打开本地 JSON 文件 |
| Save JSON | 保存为 .json 文件 |
| Save TXT | 保存为 .txt 文件 |
| Copy | 复制格式化后的 JSON 到剪贴板（右上角绿色提示） |
| Compare | 打开 JSON 对比窗口 |

### 界面特性

- **深色主题** - 开发者友好的深色界面
- **拟态风格按钮** - 立体阴影效果，悬停和点击有视觉反馈
- **可拖拽调整宽度** - 左侧和右侧面板可拖拽调整大小
- **流畅交互** - 所有操作即时响应，无卡顿

---

## 安装

### 下载安装包

从 [GitHub Releases](https://github.com/ZhuXJun/easy-json/releases) 下载最新版本：

- `EasyJSON Setup 1.0.0.exe` - Windows 安装程序
- 支持自定义安装路径
- 自动创建桌面快捷方式和开始菜单

### 从源码构建

```bash
# 克隆项目
git clone https://github.com/ZhuXJun/easy-json.git
cd easy-json

# 安装依赖
npm install

# 开发模式运行
npm run dev

# 构建生产版本
npm run build

# 打包 Windows 安装程序
npm run electron:build
```

---

## 技术栈

| 技术 | 用途 |
|------|------|
| Electron | 桌面应用框架，文件读写 |
| React | UI 组件库 |
| Vite | 构建工具 |
| CodeMirror | 代码编辑器（语法高亮、行号、折叠） |
| CSS | 样式（深色主题、拟态风格） |

---

## 项目结构

```
easy-json/
├── electron/
│   ├── main.js          # Electron 主进程
│   └── preload.js       # 预加载脚本（安全 IPC）
├── src/
│   ├── components/
│   │   ├── HistoryPanel/ # 历史记录面板
│   │   ├── JsonEditor/   # JSON 编辑器
│   │   ├── JsonTree/     # JSON 树形视图
│   │   ├── JsonCompare/  # JSON 对比窗口
│   │   └── Toolbar/      # 工具栏
│   ├── utils/
│   │   └── json.js       # JSON 工具函数
│   ├── App.jsx           # 主应用组件
│   ├── App.css           # 全局样式
│   └── main.jsx          # 入口文件
├── index.html
├── package.json
├── vite.config.js
└── easyjson-logo.png     # 应用图标
```

---

## 使用说明

### 基本使用

1. 打开 EasyJSON
2. 左侧自动创建一个空白 `JSON 1` 文档
3. 在中间编辑器粘贴或输入 JSON
4. 右侧树形视图实时展示 JSON 结构
5. 使用工具栏按钮保存或复制

### 对比 JSON

1. 点击工具栏 `Compare` 按钮
2. 在左右两个文本框分别粘贴 JSON
3. 自动显示差异，不同行用绿色标记
4. 点击 ◀ / ▶ 跳转到下一个差异
5. 点击 `rootPath` 开关切换对比模式

### 编辑 JSON

- **编辑器中直接编辑** - 修改后右侧树形视图实时更新
- **树形视图中编辑** - 双击 key 或 value 直接内联编辑
- **右键菜单编辑** - 右键节点选择 Edit Key 或 Edit Value

---

## 许可证

MIT License

---

## 项目地址

https://github.com/ZhuXJun/easy-json
