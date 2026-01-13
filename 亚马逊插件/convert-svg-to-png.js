const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// 输入SVG文件路径
const svgPath = path.join(__dirname, 'icons', 'icon.svg');
// 输出目录
const outputDir = path.join(__dirname, 'icons');

// 检查输入文件是否存在
if (!fs.existsSync(svgPath)) {
    console.error(`错误: 输入文件 ${svgPath} 不存在`);
    process.exit(1);
}

// 要生成的PNG尺寸
const sizes = [16, 48, 128];

// 转换函数
async function convertSvgToPng() {
    try {
        // 读取SVG文件
        const svgBuffer = fs.readFileSync(svgPath);
        
        // 为每个尺寸生成PNG
        for (const size of sizes) {
            const outputPath = path.join(outputDir, `icon${size}.png`);
            
            await sharp(svgBuffer)
                .resize(size, size)
                .png()
                .toFile(outputPath);
            
            console.log(`已生成: ${outputPath}`);
        }
        
        console.log('\n转换完成！');
    } catch (error) {
        console.error('转换失败:', error.message);
        process.exit(1);
    }
}

// 执行转换
convertSvgToPng();
