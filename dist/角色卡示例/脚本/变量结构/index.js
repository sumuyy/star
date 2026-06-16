import * as __WEBPACK_EXTERNAL_MODULE_https_testingcf_jsdelivr_net_gh_StageDog_tavern_resource_dist_util_mvu_zod_js_8998c919__ from "https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js";

var __webpack_modules__ = {
  "./示例/角色卡示例/schema.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    eval("{__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   Schema: () => (/* binding */ Schema)\n/* harmony export */ });\n/* harmony import */ var zod__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! zod */ \"zod\");\n/* harmony import */ var zod__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(zod__WEBPACK_IMPORTED_MODULE_0__);\n\nconst Schema = zod__WEBPACK_IMPORTED_MODULE_0__.z.object({\n    世界: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({\n        当前时间: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),\n        当前地点: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),\n        近期事务: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe('事务名'), zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe('事务描述')),\n    }),\n    白娅: zod__WEBPACK_IMPORTED_MODULE_0__.z\n        .object({\n        依存度: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number().transform(v => _.clamp(v, 0, 100)),\n        着装: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.enum(['上装', '下装', '内衣', '袜子', '鞋子', '饰品']), zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe('服装描述')),\n        称号: zod__WEBPACK_IMPORTED_MODULE_0__.z.record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe('称号名'), zod__WEBPACK_IMPORTED_MODULE_0__.z.object({\n            效果: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),\n            自我评价: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),\n        })),\n    })\n        .transform(data => {\n        const $依存度阶段 = data.依存度 < 20\n            ? '消极自毁'\n            : data.依存度 < 40\n                ? '渴求注视'\n                : data.依存度 < 60\n                    ? '暗中靠近'\n                    : data.依存度 < 80\n                        ? '忐忑相依'\n                        : '柔软依存';\n        data.称号 = _(data.称号)\n            .entries()\n            .takeRight(Math.ceil(data.依存度 / 10))\n            .fromPairs()\n            .value();\n        return { ...data, $依存度阶段 };\n    }),\n    主角: zod__WEBPACK_IMPORTED_MODULE_0__.z.object({\n        物品栏: zod__WEBPACK_IMPORTED_MODULE_0__.z\n            .record(zod__WEBPACK_IMPORTED_MODULE_0__.z.string().describe('物品名'), zod__WEBPACK_IMPORTED_MODULE_0__.z.object({\n            描述: zod__WEBPACK_IMPORTED_MODULE_0__.z.string(),\n            数量: zod__WEBPACK_IMPORTED_MODULE_0__.z.coerce.number(),\n        }))\n            .transform(data => _.pickBy(data, ({ 数量 }) => 数量 > 0)),\n    }),\n});\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi/npLrkvosv6KeS6Imy5Y2h56S65L6LL3NjaGVtYS50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7O0FBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsInNvdXJjZXMiOlsic3JjOi8vdGF2ZXJuX2hlbHBlcl90ZW1wbGF0ZS/npLrkvosv6KeS6Imy5Y2h56S65L6LL3NjaGVtYS50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJleHBvcnQgY29uc3QgU2NoZW1hID0gei5vYmplY3Qoe1xuICAgIOS4lueVjDogei5vYmplY3Qoe1xuICAgICAgICDlvZPliY3ml7bpl7Q6IHouc3RyaW5nKCksXG4gICAgICAgIOW9k+WJjeWcsOeCuTogei5zdHJpbmcoKSxcbiAgICAgICAg6L+R5pyf5LqL5YqhOiB6LnJlY29yZCh6LnN0cmluZygpLmRlc2NyaWJlKCfkuovliqHlkI0nKSwgei5zdHJpbmcoKS5kZXNjcmliZSgn5LqL5Yqh5o+P6L+wJykpLFxuICAgIH0pLFxuICAgIOeZveWohTogelxuICAgICAgICAub2JqZWN0KHtcbiAgICAgICAg5L6d5a2Y5bqmOiB6LmNvZXJjZS5udW1iZXIoKS50cmFuc2Zvcm0odiA9PiBfLmNsYW1wKHYsIDAsIDEwMCkpLFxuICAgICAgICDnnYDoo4U6IHoucmVjb3JkKHouZW51bShbJ+S4iuijhScsICfkuIvoo4UnLCAn5YaF6KGjJywgJ+iinOWtkCcsICfpnovlrZAnLCAn6aWw5ZOBJ10pLCB6LnN0cmluZygpLmRlc2NyaWJlKCfmnI3oo4Xmj4/ov7AnKSksXG4gICAgICAgIOensOWPtzogei5yZWNvcmQoei5zdHJpbmcoKS5kZXNjcmliZSgn56ew5Y+35ZCNJyksIHoub2JqZWN0KHtcbiAgICAgICAgICAgIOaViOaenDogei5zdHJpbmcoKSxcbiAgICAgICAgICAgIOiHquaIkeivhOS7tzogei5zdHJpbmcoKSxcbiAgICAgICAgfSkpLFxuICAgIH0pXG4gICAgICAgIC50cmFuc2Zvcm0oZGF0YSA9PiB7XG4gICAgICAgIGNvbnN0ICTkvp3lrZjluqbpmLbmrrUgPSBkYXRhLuS+neWtmOW6piA8IDIwXG4gICAgICAgICAgICA/ICfmtojmnoHoh6rmr4EnXG4gICAgICAgICAgICA6IGRhdGEu5L6d5a2Y5bqmIDwgNDBcbiAgICAgICAgICAgICAgICA/ICfmuLTmsYLms6jop4YnXG4gICAgICAgICAgICAgICAgOiBkYXRhLuS+neWtmOW6piA8IDYwXG4gICAgICAgICAgICAgICAgICAgID8gJ+aal+S4remdoOi/kSdcbiAgICAgICAgICAgICAgICAgICAgOiBkYXRhLuS+neWtmOW6piA8IDgwXG4gICAgICAgICAgICAgICAgICAgICAgICA/ICflv5Dlv5Hnm7jkvp0nXG4gICAgICAgICAgICAgICAgICAgICAgICA6ICfmn5Tova/kvp3lrZgnO1xuICAgICAgICBkYXRhLuensOWPtyA9IF8oZGF0YS7np7Dlj7cpXG4gICAgICAgICAgICAuZW50cmllcygpXG4gICAgICAgICAgICAudGFrZVJpZ2h0KE1hdGguY2VpbChkYXRhLuS+neWtmOW6piAvIDEwKSlcbiAgICAgICAgICAgIC5mcm9tUGFpcnMoKVxuICAgICAgICAgICAgLnZhbHVlKCk7XG4gICAgICAgIHJldHVybiB7IC4uLmRhdGEsICTkvp3lrZjluqbpmLbmrrUgfTtcbiAgICB9KSxcbiAgICDkuLvop5I6IHoub2JqZWN0KHtcbiAgICAgICAg54mp5ZOB5qCPOiB6XG4gICAgICAgICAgICAucmVjb3JkKHouc3RyaW5nKCkuZGVzY3JpYmUoJ+eJqeWTgeWQjScpLCB6Lm9iamVjdCh7XG4gICAgICAgICAgICDmj4/ov7A6IHouc3RyaW5nKCksXG4gICAgICAgICAgICDmlbDph486IHouY29lcmNlLm51bWJlcigpLFxuICAgICAgICB9KSlcbiAgICAgICAgICAgIC50cmFuc2Zvcm0oZGF0YSA9PiBfLnBpY2tCeShkYXRhLCAoeyDmlbDph48gfSkgPT4g5pWw6YePID4gMCkpLFxuICAgIH0pLFxufSk7XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///./示例/角色卡示例/schema.ts\n\n}");
  },
  "./示例/角色卡示例/脚本/变量结构/index.ts"(__unused_webpack_module, __webpack_exports__, __webpack_require__) {
    eval('{__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var https_testingcf_jsdelivr_net_gh_StageDog_tavern_resource_dist_util_mvu_zod_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js */ "https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js");\n/* harmony import */ var _schema__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../schema */ "./示例/角色卡示例/schema.ts");\n\n\n$(() => {\n    (0,https_testingcf_jsdelivr_net_gh_StageDog_tavern_resource_dist_util_mvu_zod_js__WEBPACK_IMPORTED_MODULE_0__.registerMvuSchema)(_schema__WEBPACK_IMPORTED_MODULE_1__.Schema);\n});\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiLi/npLrkvosv6KeS6Imy5Y2h56S65L6LL+iEmuacrC/lj5jph4/nu5PmnoQvaW5kZXgudHMiLCJtYXBwaW5ncyI6Ijs7O0FBQUE7QUFDQTtBQUVBO0FBQ0E7QUFDQSIsInNvdXJjZXMiOlsic3JjOi8vdGF2ZXJuX2hlbHBlcl90ZW1wbGF0ZS/npLrkvosv6KeS6Imy5Y2h56S65L6LL+iEmuacrC/lj5jph4/nu5PmnoQvaW5kZXgudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgcmVnaXN0ZXJNdnVTY2hlbWEgfSBmcm9tICdodHRwczovL3Rlc3RpbmdjZi5qc2RlbGl2ci5uZXQvZ2gvU3RhZ2VEb2cvdGF2ZXJuX3Jlc291cmNlL2Rpc3QvdXRpbC9tdnVfem9kLmpzJztcbmltcG9ydCB7IFNjaGVtYSB9IGZyb20gJy4uLy4uL3NjaGVtYSc7XG5cbiQoKCkgPT4ge1xuICByZWdpc3Rlck12dVNjaGVtYShTY2hlbWEpO1xufSk7XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///./示例/角色卡示例/脚本/变量结构/index.ts\n\n}');
  },
  "https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/util/mvu_zod.js"(module) {
    module.exports = __WEBPACK_EXTERNAL_MODULE_https_testingcf_jsdelivr_net_gh_StageDog_tavern_resource_dist_util_mvu_zod_js_8998c919__;
  },
  zod(module) {
    module.exports = z;
  }
};

var __webpack_module_cache__ = {};

function __webpack_require__(moduleId) {
  var cachedModule = __webpack_module_cache__[moduleId];
  if (cachedModule !== undefined) {
    return cachedModule.exports;
  }
  var module = __webpack_module_cache__[moduleId] = {
    exports: {}
  };
  if (!(moduleId in __webpack_modules__)) {
    delete __webpack_module_cache__[moduleId];
    var e = new Error("Cannot find module '" + moduleId + "'");
    e.code = "MODULE_NOT_FOUND";
    throw e;
  }
  __webpack_modules__[moduleId](module, module.exports, __webpack_require__);
  return module.exports;
}

(() => {
  __webpack_require__.n = module => {
    var getter = module && module.__esModule ? () => module["default"] : () => module;
    __webpack_require__.d(getter, {
      a: getter
    });
    return getter;
  };
})();

(() => {
  __webpack_require__.d = (exports, definition) => {
    for (var key in definition) {
      if (__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
        Object.defineProperty(exports, key, {
          enumerable: true,
          get: definition[key]
        });
      }
    }
  };
})();

(() => {
  __webpack_require__.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
})();

(() => {
  __webpack_require__.r = exports => {
    if (typeof Symbol !== "undefined" && Symbol.toStringTag) {
      Object.defineProperty(exports, Symbol.toStringTag, {
        value: "Module"
      });
    }
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
  };
})();

var __webpack_exports__ = __webpack_require__("./示例/角色卡示例/脚本/变量结构/index.ts");