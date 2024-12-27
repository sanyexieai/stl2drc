import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { DRACOExporter } from 'three/addons/exporters/DRACOExporter.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';

let originalScene, originalCamera, originalRenderer, originalControls;
let convertedScene, convertedCamera, convertedRenderer, convertedControls;
let currentMesh = null;
let convertedMesh = null;
let convertedBuffer = null;

// 初始化场景
function init() {
    console.log('初始化场景');
    // 初始化原始模型场景
    originalScene = new THREE.Scene();
    originalScene.background = new THREE.Color(0xf0f0f0);

    originalCamera = new THREE.PerspectiveCamera(75, window.innerWidth / 2 / window.innerHeight, 0.1, 1000);
    originalCamera.position.z = 5;

    originalRenderer = new THREE.WebGLRenderer({ antialias: true });
    originalRenderer.setSize(window.innerWidth / 2, window.innerHeight);
    document.getElementById('originalContainer').appendChild(originalRenderer.domElement);

    // 添加轨道控制
    originalControls = new OrbitControls(originalCamera, originalRenderer.domElement);
    
    // 添加光源
    const ambientLight = new THREE.AmbientLight(0x404040);
    originalScene.add(ambientLight.clone());
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    originalScene.add(directionalLight.clone());

    // 初始化转换后模型场景
    convertedScene = new THREE.Scene();
    convertedScene.background = new THREE.Color(0xf0f0f0);

    convertedCamera = new THREE.PerspectiveCamera(75, window.innerWidth / 2 / window.innerHeight, 0.1, 1000);
    convertedCamera.position.z = 5;

    convertedRenderer = new THREE.WebGLRenderer({ antialias: true });
    convertedRenderer.setSize(window.innerWidth / 2, window.innerHeight);
    document.getElementById('convertedContainer').appendChild(convertedRenderer.domElement);

    convertedControls = new OrbitControls(convertedCamera, convertedRenderer.domElement);
    
    convertedScene.add(ambientLight.clone());
    convertedScene.add(directionalLight.clone());

    // 添加网格辅助线
    const gridHelper = new THREE.GridHelper(10, 10);
    originalScene.add(gridHelper);
    convertedScene.add(gridHelper.clone());

    animate();
}

// 动画循环
function animate() {
    requestAnimationFrame(animate);
    originalControls.update();
    convertedControls.update();
    originalRenderer.render(originalScene, originalCamera);
    convertedRenderer.render(convertedScene, convertedCamera);
}

// 加载STL文件
function loadSTL(file) {
    console.log('开始加载STL文件:', file.name);
    const reader = new FileReader();
    reader.onload = function(e) {
        console.log('STL文件读取完成，开始解析');
        console.log('文件大小:', e.target.result.byteLength, '字节');
        const stlLoader = new STLLoader();
        try {
            const geometry = stlLoader.parse(e.target.result);
            console.log('STL解析完成，显示模型');
            console.log('几何体信息:', {
                vertices: geometry.attributes.position.count,
                hasNormals: !!geometry.attributes.normal,
                hasUvs: !!geometry.attributes.uv,
                boundingBox: geometry.boundingBox,
                boundingSphere: geometry.boundingSphere
            });
            displayGeometry(geometry);
            // 显示转换为DRC按钮，隐藏转换为STL按钮
            document.getElementById('convertToDraco').style.display = 'inline-block';
            document.getElementById('convertToStl').style.display = 'none';
        } catch (error) {
            console.error('STL解析错误:', error);
            alert('STL文件解析失败: ' + error.message);
        }
    };
    reader.onerror = function(error) {
        console.error('文件读取错误:', error);
        alert('文件读取失败');
    };
    reader.readAsArrayBuffer(file);
}

// 加载DRC文件
function loadDRC(file) {
    console.log('开始加载DRC文件:', file.name);
    const reader = new FileReader();
    reader.onload = function(e) {
        console.log('DRC文件读取完成，开始解析');
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        dracoLoader.preload();
        dracoLoader.decodeDracoFile(e.target.result, function(geometry) {
            console.log('DRC解析完成，显示模型');
            displayGeometry(geometry);
            // 显示转换为STL按钮，隐藏转换为DRC按钮
            document.getElementById('convertToDraco').style.display = 'none';
            document.getElementById('convertToStl').style.display = 'inline-block';
        });
    };
    reader.readAsArrayBuffer(file);
}

// 显示几何体
function displayGeometry(geometry, isConverted = false) {
    console.log('开始显示几何体', isConverted ? '(转换后)' : '(原始)');
    const targetScene = isConverted ? convertedScene : originalScene;
    const targetCamera = isConverted ? convertedCamera : originalCamera;
    const targetControls = isConverted ? convertedControls : originalControls;
    
    if (isConverted) {
        if (convertedMesh) {
            targetScene.remove(convertedMesh);
        }
    } else {
        if (currentMesh) {
            targetScene.remove(currentMesh);
        }
    }

    const material = new THREE.MeshPhongMaterial({ 
        color: 0x808080,
        specular: 0x111111,
        shininess: 200 
    });
    const mesh = new THREE.Mesh(geometry, material);
    
    // 确保几何体有法线
    if (!geometry.attributes.normal) {
        geometry.computeVertexNormals();
    }
    
    // 设置网格位置和旋转
    mesh.rotation.x = -Math.PI / 2; // STL 通常需要旋转以正确显示
    
    if (isConverted) {
        convertedMesh = mesh;
    } else {
        currentMesh = mesh;
    }

    // 自动调整相机位置
    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const distance = maxDim * 2;
    
    // 设置相机位置和目标
    targetCamera.position.set(
        center.x + distance,
        center.y + distance,
        center.z + distance
    );
    targetCamera.lookAt(center);
    targetControls.target.copy(center);
    targetControls.update();

    console.log('添加网格到场景', {
        position: mesh.position,
        rotation: mesh.rotation,
        scale: mesh.scale
    });
    targetScene.add(mesh);
}

// 转换为Draco格式
async function convertToDraco(geometry) {
    try {
        console.log('开始转换为DRC格式');
        console.log('开始编码模型');
        
        const dracoEncoder = new DRACOExporter();
        console.log('当前模型:', currentMesh);
        
        // 确保几何体有法线
        if (!currentMesh.geometry.attributes.normal) {
            currentMesh.geometry.computeVertexNormals();
        }
        
        // 使用Three.js的DRACOExporter进行压缩
        const dracoGeometry = dracoEncoder.parse(currentMesh, {
            // 压缩选项
            decodeSpeed: 5,
            encodeSpeed: 5,
            encoderMethod: DRACOExporter.MESH_EDGEBREAKER_ENCODING,
            quantization: [16, 8, 8, 8, 8],
            exportUvs: true,
            exportNormals: true,
            exportColor: false
        });
        
        console.log('编码完成，结果大小:', dracoGeometry.byteLength, '字节');
        convertedBuffer = dracoGeometry;
        window.lastConvertedFormat = 'drc'; // 记录最后的转换格式
        
        // 加载转换后的模型并显示
        console.log('开始解码转换后的模型用于显示');
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        dracoLoader.setWorkerLimit(1);
        
        const geometry = await new Promise((resolve, reject) => {
            dracoLoader.decodeDracoFile(dracoGeometry, resolve, null, reject);
        });
        
        console.log('解码完成，显示转换后的模型');
        displayGeometry(geometry, true);
        
        return dracoGeometry;
    } catch (error) {
        console.error('转换失败，详细错误:', error);
        console.error('错误栈:', error.stack);
        alert('转换失败: ' + error.message);
    }
}

// 转换为STL格式
function convertToSTL(geometry) {
    const stlExporter = new STLExporter();
    const stlData = stlExporter.parse(currentMesh);
    convertedBuffer = new TextEncoder().encode(stlData).buffer;
    window.lastConvertedFormat = 'stl'; // 记录最后的转换格式
    return convertedBuffer;
}

// 清空场景
function clearScenes() {
    // 清空原始场景
    if (currentMesh) {
        originalScene.remove(currentMesh);
        currentMesh = null;
    }
    
    // 清空转换后场景
    if (convertedMesh) {
        convertedScene.remove(convertedMesh);
        convertedMesh = null;
    }
    
    // 重置转换缓冲区
    convertedBuffer = null;
    
    // 重置相机位置
    originalCamera.position.set(0, 0, 5);
    convertedCamera.position.set(0, 0, 5);
    originalCamera.lookAt(0, 0, 0);
    convertedCamera.lookAt(0, 0, 0);
    originalControls.target.set(0, 0, 0);
    convertedControls.target.set(0, 0, 0);
    originalControls.update();
    convertedControls.update();
}

// 事件监听器设置
document.addEventListener('DOMContentLoaded', function() {
    init();
    // 初始隐藏转换按钮
    document.getElementById('convertToDraco').style.display = 'none';
    document.getElementById('convertToStl').style.display = 'none';

    document.getElementById('fileInput').addEventListener('change', function(e) {
        const file = e.target.files[0];
        console.log('选择文件:', file.name);
        // 清空两个场景
        clearScenes();
        if (file.name.toLowerCase().endsWith('.stl')) {
            loadSTL(file);
        } else if (file.name.toLowerCase().endsWith('.drc')) {
            loadDRC(file);
        }
    });

    document.getElementById('convertToDraco').addEventListener('click', async function() {
        if (currentMesh) {
            await convertToDraco(currentMesh.geometry);
        }
    });

    document.getElementById('convertToStl').addEventListener('click', function() {
        if (currentMesh) {
            convertToSTL(currentMesh.geometry);
            // 将STL数据转换回几何体并显示
            const stlLoader = new STLLoader();
            const geometry = stlLoader.parse(convertedBuffer);
            displayGeometry(geometry, true);
        }
    });

    document.getElementById('downloadFile').addEventListener('click', function() {
        if (convertedBuffer) {
            const blob = new Blob([convertedBuffer]);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            // 使用记录的格式作为文件后缀
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            a.download = `converted_model_${timestamp}.${window.lastConvertedFormat}`;
            a.click();
            URL.revokeObjectURL(url);
        }
    });
});

// 窗口大小调整处理
window.addEventListener('resize', function() {
    originalCamera.aspect = window.innerWidth / 2 / window.innerHeight;
    originalCamera.updateProjectionMatrix();
    originalRenderer.setSize(window.innerWidth / 2, window.innerHeight);
    
    convertedCamera.aspect = window.innerWidth / 2 / window.innerHeight;
    convertedCamera.updateProjectionMatrix();
    convertedRenderer.setSize(window.innerWidth / 2, window.innerHeight);
}); 