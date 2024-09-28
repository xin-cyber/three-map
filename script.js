import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as d3 from 'd3';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';

const colorArray = [
    '#6d8cbe',
    '#7390bf',
    '#87a0c4',
    '#7e99c3',
    '#7591bf',
    '#7c97c1',
    '#809bc3',
    '#7290c1',
    '#869fc4',
    '#7c98c3',
    '#6c8bbf'
]
const main = () => {
    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        canvas: document.querySelector('#container'),
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    const camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / window.innerHeight,
        1,
        500,
    );
    const initYDistance = 370;
    camera.position.set(0, initYDistance, 250);
    camera.lookAt(0, 0, 250);

    const controls = new OrbitControls(
        camera,
        renderer.domElement,
    );
    controls.maxDistance = initYDistance;
    controls.minDistance = initYDistance;
    controls.minPolarAngle = Math.PI * 0.05;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.update();

    // 场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    const helper = new THREE.GridHelper(2500, 100);
    scene.add(helper);

    const color = 0xffffff;
    const intensity = 1;
    // 环境光
    const light = new THREE.AmbientLight(color, intensity);
    // 加入场景
    scene.add(light);

    // 以杭州为中心 修改坐标
    const projection1 = d3
        .geoMercator()
        .center([120.153576, 30.287459])
        .translate([0, 0]);

    const loader = new THREE.FileLoader();
    loader.load('/zhejiang.json', (data) => {
        const jsondata = JSON.parse(data);
        resolveData(jsondata);
    });

    const map = new THREE.Object3D();
    // 解析数据
    const resolveData = (jsondata) => {
        // 全国信息
        const features = jsondata.features;

        features.forEach(async (feature, index) => {
            // 单个省份 对象
            const province = new THREE.Object3D();
            // 地址
            province.properties = feature.properties.name;
            const coordinates = feature.geometry.coordinates;
            const centerPosition = feature.properties.center;
            const centerName = feature.properties.name;
            const color = centerName === "杭州市" ? "#3d68b6" : colorArray[index] || '#6a88bc';
            const lineColor = "#3163b4"
            let textMesh;

            // 绘制中心位置
            const centerP = computeCenter(coordinates);
            // 绘制中心位置
            textMesh = await drawFont(projection1(centerP), centerName);

            if (feature.geometry.type === 'MultiPolygon') {
                // 多个，多边形
                coordinates.forEach((coordinate) => {
                    // coordinate 多边形数据
                    coordinate.forEach((rows) => {
                        const mesh = drawExtrudeMesh(
                            rows,
                            color,
                            projection1,
                        );
                        const line = lineDraw(rows, color, projection1);

                        // 唯一标识
                        mesh.properties = feature.properties.name;

                        province.add(line);
                        province.add(mesh);
                    });
                });
            }

            if (feature.geometry.type === 'Polygon') {
                // 多边形
                // coordinates.forEach( (coordinate) => {
                //     const mesh =  drawExtrudeMesh(
                //         coordinate,
                //         color,
                //         projection1,
                //     );
                //     const line = lineDraw(coordinate, lineColor, projection1);
                //     // 唯一标识
                //     mesh.properties = feature.properties.name;

                //     province.add(line);
                //     province.add(mesh);
                // });
            }
            map.add(textMesh);
            // 省份名称
            province.name = feature.properties.name;
            // 省份唯一标识
            map.add(province);
        });
        // 将map旋转值面朝上
        map.rotation.x = -Math.PI / 2;
        map.scale.set(15, 15, 1);
        scene.add(map);
    };

    /**
     * 立体几何图形
     * @param polygon 多边形 点数组
     * @param color 材质颜色
     * */
    const drawExtrudeMesh = (polygon, color, projection) => {

        const shape = new THREE.Shape();
        polygon.forEach((row, i) => {
            const [x, y] = projection(row);
            if (i === 0) {
                shape.moveTo(x, -y);
            }
            shape.lineTo(x, -y);
        });

        const extrudeGeometry = new THREE.ExtrudeGeometry(shape, {
            depth: 10,
            bevelEnabled: false,
        });

        const extrudeMeshMaterial = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.9,
        });

        return new THREE.Mesh(extrudeGeometry, extrudeMeshMaterial);

    };

    /**
     * 
     * @param {中心点坐标} centerPosition 
     * @param {中心点名称} centerName 
     * @returns 
     */
    const drawFont = (centerPosition, centerName) => {
        return new Promise((resolve, reject) => {
            const loader = new FontLoader();
            loader.load('/f.json', (font) => {
                if (!font) {
                    reject('Font loading failed.');
                    return;
                }
                const textGeometry = new TextGeometry(centerName, {
                    font: font,
                    size: 0.2,
                    depth: 0.1,
                    bevelEnabled: false,
                });

                const textMaterial = new THREE.MeshBasicMaterial({
                    color: '#fff',
                });

                const textMesh = new THREE.Mesh(textGeometry, textMaterial);
                const [x, y] = centerPosition;
                textMesh.position.set(x, -y, 10);
                resolve(textMesh);
            }, undefined, (error) => {
                reject('Font loading error: ' + error);
            });
        })
    }

    /**
     * 
     * @param {位置数组} coordinates 
     * @returns 
     */
    const computeCenter = (coordinates) => {
        // 展平数组并提取经纬度
        const flatCoords = coordinates.flat(2);
        const sum = flatCoords.reduce((acc, coord) => {
            acc[0] += coord[0];
            acc[1] += coord[1];
            return acc;
        }, [0, 0]);
        const centerPoint = [sum[0] / flatCoords.length, sum[1] / flatCoords.length];
        return centerPoint;
    }
    /**
     * 边框 图形绘制
     * @param polygon 多边形点数组
     * @param color 材质颜色
     * */
    const lineDraw = (polygon, color, projection) => {
        const lineGeometry = new THREE.BufferGeometry();
        const pointsArray = new Array();
        polygon.forEach((row) => {
            const [x, y] = projection(row);
            // 创建三维点
            pointsArray.push(new THREE.Vector3(x, -y, 9));
        });
        // 放入多个点
        lineGeometry.setFromPoints(pointsArray);

        const lineMaterial = new THREE.LineBasicMaterial({
            color: color,
        });
        return new THREE.Line(lineGeometry, lineMaterial);
    }

    /**
     * 获取鼠标在three.js 中归一化坐标
     * */
    const setPickPosition = (event) => {
        let pickPosition = { x: 0, y: 0 };
        pickPosition.x =
            (event.clientX / renderer.domElement.width) * 2 - 1;
        pickPosition.y =
            (event.clientY / renderer.domElement.height) * -2 + 1;
        return pickPosition;
    }

    let lastPick = null;
    let lastPickColor = ""
    // 鼠标点击事件
    const onRay = (event) => {
        let pickPosition = setPickPosition(event);
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(pickPosition, camera);
        // 计算物体和射线的交点
        const intersects = raycaster.intersectObjects([map], true);
        const intersectExtudeMesh = intersects.find((item) => {
            return item.object.geometry.type === "ExtrudeGeometry"
        })
        // 数组大于0 表示有相交对象
        if (intersectExtudeMesh) {
            if (lastPick && lastPickColor) {
                if (
                    lastPick.object.properties !==
                    intersectExtudeMesh.object.properties
                ) {
                    lastPick.object.material.color.set(lastPickColor);
                    lastPick = intersectExtudeMesh;
                    lastPickColor = JSON.parse(JSON.stringify(intersectExtudeMesh.object.material.color));
                    intersectExtudeMesh.object.material.color.set('#c699aa');
                } else {
                    lastPick.object.material.color.set(lastPickColor);
                    lastPick = null;
                    lastPickColor = "";
                    setToolTip('')
                    return
                }
            } else {
                lastPick = intersectExtudeMesh;
                lastPickColor = JSON.parse(JSON.stringify(intersectExtudeMesh.object.material.color));
                intersectExtudeMesh.object.material.color.set('#c699aa');
            }
            setToolTip(intersectExtudeMesh.object.properties)
        } else {
            if (lastPick && lastPickColor) {
                // 复原
                if (lastPick.object.properties) {
                    lastPick.object.material.color.set(lastPickColor);
                    lastPick = null;
                }
            }
            setToolTip('')
        }
    }

    const onMove = (event) => {
        let mousePosition = setPickPosition(event)
        // let tooltip = document.getElementById('tooltip')
        // tooltip.style.left = event.clientX + 2 + 'px'
        // tooltip.style.top = event.clientY + 2 + 'px'
        const raycaster = new THREE.Raycaster()
        raycaster.setFromCamera(mousePosition, camera)
        // 计算物体和射线的交点
        const intersects = raycaster.intersectObjects([map], true)
        // 数组大于0 表示有相交对象
        if (intersects.length > 0) {
            if (intersects[0].object.properties) {
                document.querySelector("body").style.cursor = 'pointer'
            }
            // tooltip.style.visibility = 'visible'
        } else {
            document.querySelector("body").style.cursor = 'default'
            // tooltip.style.visibility = 'hidden'
        }
    }

    let travelData = []
    /**
     * 
     * @param {市名} proviceName 
     */
    const setToolTip = (proviceName) => {
        
        const tooltip = document.getElementById('tooltip')
        if (proviceName) {
            tooltip.style.display = 'block'
            generateDom(tooltip,proviceName,travelData.find((item) => item.city === proviceName)?.attractions)
        } else {
            tooltip.style.display = 'none'
        }
    }

    const generateDom = (container,cityName,attractions) => {
        container.innerHTML = ''
        const title = document.createElement('h1')
        title.innerHTML = cityName
        container.appendChild(title)

        attractions.forEach((item) => {
            const name = document.createElement('p')
            const description = document.createElement('div')
            name.innerHTML = item.name
            description.innerHTML = item.description
            container.appendChild(name)
            container.appendChild(description)
        })
    }

    const initToolTip = () => {
        const tooltip = document.createElement('div')
        tooltip.id = 'tooltip'
        document.body.appendChild(tooltip)
        loader.load('/travel.json', (json) => {
            travelData = JSON.parse(json)
        })
    }

    // 监听鼠标
    window.addEventListener('click', onRay)
    window.addEventListener('mousemove', onMove)


    const render = () => {
        renderer.render(scene, camera);
        requestAnimationFrame(render);
    };
    render();
    initToolTip()
}
main()
