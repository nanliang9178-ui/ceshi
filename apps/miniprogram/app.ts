import { loadBoot, ensureLogin, setScene } from './utils/session';

App({
  globalData: {
    boot: null as any,
    ready: false,
    launchScene: '',
  },

  onLaunch(options: any) {
    const query = (options && options.query) || {};
    const scene = query.scene ? decodeURIComponent(query.scene) : '';
    this.globalData.launchScene = scene;
    setScene(scene);

    // 并行：拉品牌配置 + 静默登录（失败不阻塞浏览菜单）
    loadBoot()
      .then((boot) => {
        this.globalData.boot = boot;
        this.globalData.ready = true;
      })
      .catch((error) => {
        console.error('bootstrap 失败', error);
      });

    ensureLogin().catch((error) => {
      console.warn('静默登录失败，将在下单时重试', error && error.message);
    });
  },

  onShow(options: any) {
    const query = (options && options.query) || {};
    if (query.scene) {
      const scene = decodeURIComponent(query.scene);
      if (scene !== this.globalData.launchScene) {
        this.globalData.launchScene = scene;
        setScene(scene);
        loadBoot(true)
          .then((boot) => {
            this.globalData.boot = boot;
          })
          .catch(() => undefined);
      }
    }
  },
});
