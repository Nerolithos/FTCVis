import { useEffect, useMemo, useRef, useState } from 'react';
import data from './data/ftc-data.json';
import imageManifest from './data/image-manifest.json';
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import showcasePdfUrl from './showcase.pdf?url';

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const FLOOR_STORY = {
  '2层': '思想碰撞核心场，承载会议、路演和服务集成。',
  '3层': '以零碳直播间和共享协同为核心，支持创新孵化。',
  '4层': '灵活会议与胶囊空间，适合高频讨论与小规模会谈。',
  '5层': '延续高效协作布局，覆盖会议与轻量直播需求。',
  '6层': '中型活动与论坛承载层，兼顾会议和展示场景。',
  '7层': '达人秀场和多功能活动层，具备强展示与联动能力。',
  顶楼: '屋顶露台与观景空间，适合品牌活动与城市景观体验。',
};

const FLOOR_INTRO_DOCX = {
  '2层': [
    '2F：路演中心和集成服务中心，是思想碰撞的核心场。',
    '路演中心热度较高，空间面积近 150㎡，可支撑企业路演、项目展示、创意发布与合作对接。',
    '同层还设置黄浦区政务服务点与活动排片表，形成线下咨询与线上小程序联动的一站式服务体验，方便企业了解并进行主体登记、财税咨询、政策申报、网信服务、版权确权等。',
    '活动排片表可以看出外滩 FTC 每周承接 40～50 场活动。 25 年 7 月开幕起首年内接待 3 万余专业客户、 举办 1950 余活动、签约 150 余企业团体高校、陪伴 135 家企业注册落地。汇聚各方资源、打通领域门槛、曝光优秀人才、共建生态平台。'
  ],
  '3层': [
    '3F：零碳直播间、共享工位，是孵化支撑的加速器。',
    '3F-5F 整体以零碳直播间、共享工位和独立办公为主，面向社区成员实行开放预约制。',
    '其中3楼以内容创作为导向，零碳直播间贯彻绿色低碳理念，配置 960 株高固碳植物幕墙，兼顾直播效果与生态美学。很多大咖大V都在此做过直播，央视等权威媒体也在这里进行采访。',
    '本层还有中国唯一金科双院士柴宏峰院士的金融科技重点实验室以及马伯庸团队的创作办公室等等。',
    '左右两侧还有合作过的高校、机构、企业、团体和内容创作者的挂名墙。'
  ],
  '4层': [
    '4F：属于 3F-5F 的协同功能层，主要是开放预定的办公工位，强调灵活办公与高频协作场景。',
    '4F 与 3F、5F 在功能定位上保持一致，适配不同规模团队的预约与交流需求。',
  ],
  '5层': [
    '5F：与 3F、4F 共同构成孵化支撑区，延续开放预约和灵活空间组织逻辑。',
    '3F-5F 功能一体化，仅在布局细节上存在差异，5 楼更侧重“一点接入，全球办公”的理念，许多境外企业签约在此。外滩 FTC 赋能企业出海与外企来沪。',
  ],
  '6层': [
    '6F：外滩 FTC 内部办公空间和中型活动承载层，面积约 100㎡+，可容纳50人规模活动。',
    '6 楼是 外滩 FTC 的内部人员的办公空间、两个中型会议室和一个中型活动厅。',
  ],
  '7层': [
    '7F：达人秀场与活动展示的制高点，面积约 400㎡+，可容纳百人规模活动。',
    '空间可联动或分区使用，适配论坛、发布、展示、研讨等不同场景，并持续引入多元主题展陈。',
  ],
  顶楼: [
    '顶楼露台：露台约 365㎡，可承载多类型主题活动与开放交流。',
    '观景区可直面黄浦江和陆家嘴天际线，形成历史与现代同框的城市景观体验。从 7 楼出发，3 段楼梯引导人连升三级，置身最顶层“IPO 层”，身前是上海的过去，远眺是上海的现在，脚下是上海的未来。',
  ],
};

const BUILDING_INTRO =
  '外滩 FTC 位于上海市黄浦区九江路 69 号，建筑总使用面积超过 5200 平方米。平台围绕金融科技与内容创作双定位，形成从会议、路演到活动展示的全场景空间网络。';

function normalizeText(value) {
  if (!value) {
    return '暂无';
  }
  const text = String(value).trim();
  return text.length ? text : '暂无';
}

function formatCapacity(room) {
  if (!room.capacity) {
    return '暂无';
  }
  if (room.capacity === '-') {
    return '按场景配置';
  }
  return `${room.capacity} 人`; 
}

function formatPrice(room) {
  if (!room.price) {
    return '暂无';
  }
  const unit = room.row >= 21 ? '元/天' : '元/小时';
  return `${room.price} ${unit}`;
}

function resolveFloorGalleryLevel(activeFloor) {
  const label = String(activeFloor?.label ?? '');
  const rawFloor = String(activeFloor?.floor ?? '');
  const matched = label.match(/\d+/) || rawFloor.match(/\d+/);
  if (matched) {
    return String(Number(matched[0]));
  }
  if (/顶楼|天台|露台/.test(`${label}${rawFloor}`)) {
    return '8';
  }
  return '';
}

function isExpectedPdfRenderInterruption(error) {
  const name = String(error?.name ?? '');
  const message = String(error?.message ?? '');
  return (
    name === 'RenderingCancelledException' ||
    name === 'AbortException' ||
    /rendering cancelled|multiple render\(\) operations/i.test(message)
  );
}

function App() {
  const floors = useMemo(
    () =>
      data.floors.filter(
        (floor) => floor.label !== '楼层' && floor.rooms && floor.rooms.length > 0
      ),
    []
  );

  const [activeFloorLabel, setActiveFloorLabel] = useState(floors[0]?.label ?? '');
  const [searchText, setSearchText] = useState('');
  const activeFloor =
    floors.find((floor) => floor.label === activeFloorLabel) ?? floors[0] ?? null;

  const visibleRooms = useMemo(() => {
    if (!activeFloor) {
      return [];
    }
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) {
      return activeFloor.rooms;
    }
    return activeFloor.rooms.filter((room) => {
      const haystack = `${room.name} ${room.screen} ${room.audio} ${room.layout}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [activeFloor, searchText]);

  const [activeRoomId, setActiveRoomId] = useState(visibleRooms[0]?.id ?? '');
  const [activeRoomImageIndex, setActiveRoomImageIndex] = useState(0);
  const [zoomImage, setZoomImage] = useState('');

  const [pptMode, setPptMode] = useState(false);
  const [pptReady, setPptReady] = useState(false);
  const [pptError, setPptError] = useState('');
  const [pptSlideIndex, setPptSlideIndex] = useState(0);
  const [pptSlideCount, setPptSlideCount] = useState(0);
  const [pptPaused, setPptPaused] = useState(false);

  const pptStageRef = useRef(null);
  const pptCanvasRef = useRef(null);
  const pptPresentationRef = useRef(null);
  const pptRenderTaskRef = useRef(null);

  useEffect(() => {
    if (!visibleRooms.length) {
      setActiveRoomId('');
      return;
    }
    if (!visibleRooms.some((room) => room.id === activeRoomId)) {
      setActiveRoomId(visibleRooms[0].id);
    }
  }, [visibleRooms, activeRoomId]);

  const activeRoom =
    visibleRooms.find((room) => room.id === activeRoomId) ?? visibleRooms[0] ?? null;
  const activeFloorIntro = FLOOR_INTRO_DOCX[activeFloor?.label] ?? ['该楼层介绍待补充。'];

  const activeRoomImages = useMemo(() => {
    if (!activeRoom) {
      return [];
    }
    const prefix = `r${String(activeRoom.row).padStart(2, '0')}`;
    const imagesFromManifest = imageManifest.roomByPrefix[prefix] ?? [];
    if (imagesFromManifest.length) {
      return imagesFromManifest;
    }
    return activeRoom.image ? [activeRoom.image] : [];
  }, [activeRoom?.id, activeRoom?.row, activeRoom?.image]);

  const floorGalleryImages = useMemo(() => {
    const level = resolveFloorGalleryLevel(activeFloor);
    if (!level) {
      return [];
    }
    return imageManifest.floorByLevel[level] ?? [];
  }, [activeFloor?.label, activeFloor?.floor]);

  const bottomGalleryImages = (floorGalleryImages.length ? floorGalleryImages : data.extraPics).slice(0, 4);

  useEffect(() => {
    setActiveRoomImageIndex(0);
  }, [activeRoom?.id]);

  useEffect(() => {
    if (activeRoomImages.length <= 1) {
      return undefined;
    }
    const timer = setInterval(() => {
      setActiveRoomImageIndex((index) => (index + 1) % activeRoomImages.length);
    }, 2600);
    return () => clearInterval(timer);
  }, [activeRoomImages]);

  const detailPhoto =
    activeRoomImages[activeRoomImageIndex] || activeRoom?.image || data.extraPics[0] || '/logo/ftc-logo.png';

  useEffect(() => {
    let cancelled = false;
    let loadingTask = null;

    async function ensurePresentationLoaded() {
      if (!pptMode) {
        return;
      }
      setPptError('');

      if (pptPresentationRef.current) {
        const cachedSlideCount = pptPresentationRef.current?.numPages ?? 0;
        setPptSlideCount(cachedSlideCount);
        setPptReady(true);
        return;
      }

      try {
        loadingTask = getDocument(showcasePdfUrl);
        const presentation = await loadingTask.promise;
        if (cancelled) {
          presentation.destroy?.();
          return;
        }
        pptPresentationRef.current = presentation;
        setPptSlideCount(presentation?.numPages ?? 0);
        setPptSlideIndex(0);
        setPptReady(true);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setPptReady(false);
        setPptError('PDF 加载失败，请确认 src/showcase.pdf 文件存在且格式正常。');
      }
    }

    ensurePresentationLoaded();

    return () => {
      cancelled = true;
      loadingTask?.destroy?.();
    };
  }, [pptMode]);

  useEffect(() => {
    if (!pptMode || !pptReady || !pptCanvasRef.current || !pptStageRef.current || !pptPresentationRef.current) {
      return;
    }

    let cancelled = false;
    let currentRenderTask = null;
    const canvas = pptCanvasRef.current;
    const stage = pptStageRef.current;

    async function renderPdfPage() {
      try {
        setPptError('');
        const pdfDoc = pptPresentationRef.current;
        pptRenderTaskRef.current?.cancel?.();
        pptRenderTaskRef.current = null;

        const page = await pdfDoc.getPage(pptSlideIndex + 1);
        if (cancelled) {
          return;
        }

        const baseViewport = page.getViewport({ scale: 1 });
        const maxWidth = Math.max(stage.clientWidth - 24, 320);
        const maxHeight = Math.max(stage.clientHeight - 24, 220);
        const scale = Math.max(0.1, Math.min(maxWidth / baseViewport.width, maxHeight / baseViewport.height));
        const viewport = page.getViewport({ scale });
        const dpr = window.devicePixelRatio || 1;

        canvas.style.opacity = '0';
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const context = canvas.getContext('2d', { alpha: false });
        if (!context) {
          throw new Error('Canvas context unavailable');
        }

        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        context.clearRect(0, 0, viewport.width, viewport.height);
        currentRenderTask = page.render({ canvasContext: context, viewport });
        pptRenderTaskRef.current = currentRenderTask;
        await currentRenderTask.promise;
        if (pptRenderTaskRef.current === currentRenderTask) {
          pptRenderTaskRef.current = null;
        }

        if (!cancelled) {
          requestAnimationFrame(() => {
            canvas.style.opacity = '1';
          });
        }
      } catch (error) {
        if (pptRenderTaskRef.current === currentRenderTask) {
          pptRenderTaskRef.current = null;
        }
        if (!cancelled && !isExpectedPdfRenderInterruption(error)) {
          setPptError('PDF 渲染失败，请检查文件内容。');
        }
      }
    }

    renderPdfPage();

    return () => {
      cancelled = true;
      currentRenderTask?.cancel?.();
      if (pptRenderTaskRef.current === currentRenderTask) {
        pptRenderTaskRef.current = null;
      }
    };
  }, [pptMode, pptReady, pptSlideIndex]);

  useEffect(() => {
    if (!pptMode || !pptReady || pptSlideCount <= 1 || pptPaused) {
      return undefined;
    }
    const timer = setInterval(() => {
      setPptSlideIndex((index) => (index + 1) % pptSlideCount);
    }, 3200);
    return () => clearInterval(timer);
  }, [pptMode, pptReady, pptSlideCount, pptPaused]);

  useEffect(() => {
    return () => {
      pptRenderTaskRef.current?.cancel?.();
      pptPresentationRef.current?.cleanup?.();
      pptPresentationRef.current?.destroy?.();
    };
  }, []);

  function openPptMode() {
    setZoomImage('');
    setPptError('');
    setPptPaused(false);
    setPptSlideIndex(0);
    setPptMode(true);
  }

  function closePptMode() {
    pptRenderTaskRef.current?.cancel?.();
    setPptMode(false);
  }

  function showPrevSlide() {
    if (!pptSlideCount) {
      return;
    }
    setPptSlideIndex((index) => (index - 1 + pptSlideCount) % pptSlideCount);
  }

  function showNextSlide() {
    if (!pptSlideCount) {
      return;
    }
    setPptSlideIndex((index) => (index + 1) % pptSlideCount);
  }

  return (
    <div className="page-shell">
      <div className="aura aura-cyan" />
      <div className="aura aura-yellow" />

      <header className="hero">
        <div className="hero-main">
          <div className="hero-logo-action-wrap">
            <button
              type="button"
              className="hero-logo-launch-main"
              onClick={openPptMode}
              title="点击播放展示 PDF"
              aria-label="点击播放展示 PDF"
            >
              <img className="hero-logo" src="/logo/logo3.png" alt="外滩 FTC 大 logo" />
            </button>
            <span className="hero-logo-hint">点击 Logo 播放展示 PDF</span>
          </div>
          <div>
            <h1>
              <span>外滩</span>
              <img className="hero-title-logo" src="/logo/ftc-logo.png" alt="FTC" />
              <span>空间可视化平台</span>
            </h1>
            <p>{BUILDING_INTRO}</p>
            <div className="hero-tags">
              <span>{data.meta.address}</span>
              <span>总面积 {data.meta.totalArea}</span>
              <span>{data.meta.floors} 层空间节点</span>
            </div>
          </div>
        </div>
      </header>

      <main className="workspace-grid">
        <section className="panel floor-panel">
          <div className="panel-title-wrap">
            <h2>楼层导览</h2>
            <p>点击楼层切换空间</p>
          </div>

          <div className="floor-tower" role="listbox" aria-label="楼层列表">
            {floors.map((floor) => {
              const isActive = floor.label === activeFloorLabel;
              return (
                <button
                  key={floor.floor}
                  type="button"
                  className={`floor-chip${isActive ? ' active' : ''}`}
                  onClick={() => {
                    setActiveFloorLabel(floor.label);
                    setSearchText('');
                  }}
                  aria-selected={isActive}
                >
                  <strong>{floor.label}</strong>
                  <span>{floor.rooms.length} 个空间</span>
                </button>
              );
            })}
          </div>

          <div className="story-box">
            <h3>{activeFloor?.label ?? '楼层'}</h3>
            <p>{FLOOR_STORY[activeFloor?.label] ?? '该楼层信息待补充。'}</p>
          </div>
        </section>

        <section className="panel room-panel">
          <div className="panel-title-wrap room-title-row">
            <div>
              <h2>房间列表</h2>
              <p>{activeFloor?.floor ?? '请选择楼层'}</p>
            </div>
            <label className="room-search" htmlFor="room-search">
              <span>检索</span>
              <input
                id="room-search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="按空间名或设备关键词"
              />
            </label>
          </div>

          <div className="floor-intro-box">
            <h3>楼层介绍</h3>
            {activeFloorIntro.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>

          <div className="room-list">
            {visibleRooms.map((room) => {
              const selected = room.id === activeRoomId;
              return (
                <button
                  key={room.id}
                  type="button"
                  className={`room-item${selected ? ' selected' : ''}`}
                  onClick={() => setActiveRoomId(room.id)}
                >
                  <div>
                    <h3>{room.name}</h3>
                    <p>{normalizeText(room.area || `${formatCapacity(room)}`)}</p>
                  </div>
                  <span>{formatPrice(room)}</span>
                </button>
              );
            })}
            {!visibleRooms.length && (
              <div className="empty-state">未找到匹配空间，尝试更换关键词。</div>
            )}
          </div>
        </section>

        <section className="panel detail-panel">
          <div className="panel-title-wrap">
            <h2>{activeRoom?.name ?? '空间详情'}</h2>
            <p>介绍信息 + 场地参数 + 设备能力</p>
          </div>

          {activeRoom ? (
            <>
              <div className="detail-photo-wrap">
                <img src={detailPhoto} alt={`${activeRoom.name} 场地照片`} className="detail-photo" />
                <div className="photo-mask">
                  <span>
                    {activeFloor?.label}
                    {activeRoomImages.length > 1
                      ? ` · ${activeRoomImageIndex + 1}/${activeRoomImages.length}`
                      : ''}
                  </span>
                  <strong>{activeRoom.name}</strong>
                </div>
              </div>

              <div className="parameter-grid">
                <article>
                  <h3>面积</h3>
                  <p>{normalizeText(activeRoom.area)}</p>
                </article>
                <article>
                  <h3>人数</h3>
                  <p>{formatCapacity(activeRoom)}</p>
                </article>
                <article>
                  <h3>试运行价格</h3>
                  <p>{formatPrice(activeRoom)}</p>
                </article>
                <article>
                  <h3>桌椅配置</h3>
                  <p>{normalizeText(activeRoom.layout)}</p>
                </article>
              </div>

              <div className="spec-blocks">
                <article>
                  <h3>投屏设备</h3>
                  <p>{normalizeText(activeRoom.screen)}</p>
                </article>
                <article>
                  <h3>音响设备</h3>
                  <p>{normalizeText(activeRoom.audio)}</p>
                </article>
              </div>

              <div className="extra-gallery">
                {bottomGalleryImages.map((pic) => (
                  <button
                    key={pic}
                    type="button"
                    className="gallery-thumb"
                    onClick={() => setZoomImage(pic)}
                    title="点击放大"
                  >
                    <img src={pic} alt="外滩 FTC 楼层现场图片" />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="empty-state">请选择房间查看详细信息。</div>
          )}
        </section>
      </main>

      {zoomImage && (
        <div className="lightbox" onClick={() => setZoomImage('')}>
          <button
            type="button"
            className="lightbox-close"
            onClick={(event) => {
              event.stopPropagation();
              setZoomImage('');
            }}
          >
            关闭
          </button>
          <img
            src={zoomImage}
            alt="楼层图片放大查看"
            className="lightbox-image"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}

      {pptMode && (
        <div className="ppt-overlay">
          <div className="ppt-stage" ref={pptStageRef}>
            {!pptReady && !pptError && <div className="ppt-status">正在加载 PDF...</div>}
            {pptError && <div className="ppt-status">{pptError}</div>}
            <canvas ref={pptCanvasRef} className="ppt-canvas" />
          </div>

          <div className="ppt-controls">
            <button type="button" className="ppt-control-btn" onClick={showPrevSlide}>
              ←
            </button>
            <button type="button" className="ppt-control-btn" onClick={showNextSlide}>
              →
            </button>
            <button type="button" className="ppt-control-btn" onClick={closePptMode}>
              退出
            </button>
            <button
              type="button"
              className={`ppt-control-btn${pptPaused ? ' active' : ''}`}
              onClick={() => setPptPaused((paused) => !paused)}
            >
              {pptPaused ? '继续' : '暂停'}
            </button>
          </div>

          <div className="ppt-indicator">
            {pptSlideCount ? `${pptSlideIndex + 1}/${pptSlideCount}` : ''}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
