import { spawnSync } from 'node:child_process';
import path from 'path';
import type { Syntax } from 'sass';

function resolveUrl(relativePath: string): URL {
  return new URL('file://' + path.resolve(__dirname, relativePath));
}

function compileInline(source: string, syntax: Syntax = 'scss'): string {
  const script = `const { readFileSync } = require('node:fs')
const path = require('node:path')
const sass = require('sass')

const payload = JSON.parse(readFileSync(0, 'utf8'))
const resolveUrl = (relativePath) => new URL('file://' + path.resolve(payload.cwd, relativePath))

try {
  const result = sass.compileString(payload.source, {
    syntax: payload.syntax,
    importers: [
      {
        findFileUrl(url) {
          switch (url) {
            case 'v_lib':
              return resolveUrl('../lib.scss')
            case 'v_util':
              return resolveUrl('../util.scss')
            default:
              return null
          }
        },
      },
    ],
  })

  process.stdout.write(JSON.stringify({ css: result.css }))
} catch (error) {
  process.stderr.write(error instanceof Error ? error.stack || error.message : String(error))
  process.exit(1)
}
`;

  const payload = JSON.stringify({ source, syntax, cwd: __dirname });
  const child = spawnSync(process.execPath, ['-e', script], { encoding: 'utf8', input: payload });

  if (child.status !== 0) {
    throw new Error(child.stderr || `Sass compilation failed with exit code ${child.status}`);
  }

  if (!child.stdout) {
    return '';
  }

  const { css } = JSON.parse(child.stdout);
  return css;
}

describe('Exports', () => {
  test('token-as-var() returns a correct variable name', () => {
    expect(
      compileInline(
        `
        @use 'v_lib' as l
        body
          color: #{l.token-as-var('sys.color.primary')}
      `,
        'indented'
      )
    ).toMatchInlineSnapshot(`
      "body {
        color: var(--sora_sys_color_primary);
      }"
    `);
  });

  test('eval-tokens() throws due to incompleteness of the tree', () => {
    expect(() =>
      compileInline(`
        @use 'v_lib' as l;
        :root {
          @include l.eval-tokens(
            (
              'sys': (
                'color': (
                  'primary': red,
                ),
              ),
            )
          );
        }
      `)
    ).toThrow(/Provided tokens data is incomplete/);
  });

  test('eval-tokens-partial() completes ok', () => {
    expect(
      compileInline(`
        @use 'v_lib' as l;

        :root {
          @include l.eval-tokens-partial(
            (
              'sys': (
                'color': (
                  'primary': red,
                ),
              ),
            )
          );
        }`)
    ).toMatchInlineSnapshot(`
      ":root {
        --sora_sys_color_primary: red;
      }"
    `);
  });

  test('light tokens preset matches to snapshot', () => {
    expect(
      compileInline(`
        @use 'v_lib' as l;
        :root {
          @include l.tokens-preset-light;
        }
      `)
    ).toMatchInlineSnapshot(`
      ":root {
        --sora_sys_color_primary: #d0021b;
        --sora_sys_color_primary-hover: #c6021a;
        --sora_sys_color_primary-pressed: #bb0218;
        --sora_sys_color_primary-focused: #b10217;
        --sora_sys_color_primary-background: #fae6e8;
        --sora_sys_color_primary-hover-background: #f6ccd1;
        --sora_sys_color_primary-pressed-background: #f1b3bb;
        --sora_sys_color_primary-focused-background: #ec9aa4;
        --sora_sys_color_content-primary: #2d2926;
        --sora_sys_color_content-secondary: #53565a;
        --sora_sys_color_content-tertiary: #75787b;
        --sora_sys_color_content-quaternary: #a3a4a8;
        --sora_sys_color_content-on-background-inverted: #fff;
        --sora_sys_color_background: #f5f7f8;
        --sora_sys_color_background-hover: #eceff0;
        --sora_sys_color_background-inverted: #4e4e4e;
        --sora_sys_color_border-primary: #dde0e1;
        --sora_sys_color_border-secondary: #eceff0;
        --sora_sys_color_disabled: #f5f7f8;
        --sora_sys_color_on-disabled: #a3a4a8;
        --sora_sys_color_util_body: #fff;
        --sora_sys_color_util_surface: #fff;
        --sora_sys_color_util_surface-overlay: rgba(255, 255, 255, 0.7);
        --sora_sys_color_util_overlay: rgba(0, 0, 0, 0.45);
        --sora_sys_color_status_success: #009900;
        --sora_sys_color_status_success-background: #ddf4dd;
        --sora_sys_color_status_success-background-hover: #b2f1b2;
        --sora_sys_color_status_warning: #ff9900;
        --sora_sys_color_status_warning-background: #fff2df;
        --sora_sys_color_status_warning-background-hover: #ffe3ba;
        --sora_sys_color_status_error: #ff0000;
        --sora_sys_color_status_error-background: #fff9fa;
        --sora_sys_color_status_error-background-hover: #ffd9df;
        --sora_sys_color_status_info: #1070ca;
        --sora_sys_color_status_info-background: #f3f6ff;
        --sora_sys_color_status_info-background-hover: #dbe4ff;
        --sora_sys_color_status_debug: #aa0e42;
        --sora_sys_color_status_debug-background: #ffeef4;
        --sora_sys_color_status_debug-background-hover: #f3d3de;
        --sora_sys_shadow_page-header: 0px 24px 80px rgba(10, 2, 34, 0.07), 0px 10.0266px 33.4221px rgba(10, 2, 34, 0.0558697), 0px 5.36071px 17.869px rgba(10, 2, 34, 0.05437), 0px 3.00517px 10.0172px rgba(10, 2, 34, 0.0484701), 0px 1.59602px 5.32008px rgba(10, 2, 34, 0.0371562), 0px 0.664142px 2.21381px rgba(10, 2, 34, 0.0208172);
        --sora_sys_shadow_page-header-light: 0px 6px 30px rgba(10, 2, 34, 0.03), 0px 3px 9px rgba(10, 2, 34, 0.02), 0px 5.36071px 6px rgba(10, 2, 34, 0.04), 0px 3.00517px 7px rgba(10, 2, 34, 0.03), 0px 1.59602px 5.32008px rgba(10, 2, 34, 0.0371562);
        --sora_sys_shadow_modal-window-header: 0px -8px 80px rgba(10, 2, 34, 0.07), 0px 1px 33.4221px rgba(10, 2, 34, 0.0558697), 0px 0px 17.869px rgba(10, 2, 34, 0.05437), 0px 2px 10.0172px rgba(10, 2, 34, 0.0484701), 0px 1.59602px 5.32008px rgba(10, 2, 34, 0.0371562), 0px 0.664142px 2.21381px rgba(10, 2, 34, 0.0208172);
        --sora_sys_shadow_floating-notification: 0px 68px 80px rgba(24, 24, 29, 0.09), 0px 30.1471px 24.1177px rgba(24, 24, 29, 0.058643), 0px 12.5216px 10.0172px rgba(24, 24, 29, 0.045), 0px 4.5288px 3.62304px rgba(24, 24, 29, 0.031357);
        --sora_sys_shadow_dropdown: 0px 0px 4px rgba(45, 41, 38, 0.08), 0px 4px 16px rgba(45, 41, 38, 0.08);
        --sora_sys_shadow_active-tab: 0px 1px 1px rgba(83, 86, 90, 0.1);
      }"
    `);
  });

  test("typography('d2') succeeds", () => {
    expect(
      compileInline(`
        @use 'v_lib' as l;
        @include l.typography('d2') {
          font-family: Sora;
          font-size: 36px;
        }
      `)
    ).toMatchInlineSnapshot(`
      ".sora-tpg-d2 {
        font-family: Sora;
        font-size: 36px;
      }"
    `);
  });

  test("typography('regulus') fails", () => {
    expect(() => compileInline(`@use 'v_lib' as l; @include l.typography('regulus');`)).toThrow(
      /Wrong typography token: "regulus"/
    );
  });

  test('typography default preset matches snapshot', () => {
    expect(compileInline(`@use 'v_lib' as l; @include l.typography-preset-default;`)).toMatchInlineSnapshot(`
      ".sora-tpg-d1 {
        font-family: Sora;
        font-size: 40px;
        font-weight: bold;
        line-height: 120%;
        letter-spacing: -0.02em;
      }

      .sora-tpg-d2 {
        font-family: Sora;
        font-size: 30px;
        font-weight: bold;
        line-height: 130%;
        letter-spacing: -0.04em;
      }

      .sora-tpg-h1 {
        font-family: Sora;
        font-size: 36px;
        font-weight: 400;
        line-height: 120%;
        letter-spacing: -0.04em;
      }

      .sora-tpg-h2 {
        font-family: Sora;
        font-size: 30px;
        font-weight: 400;
        line-height: 130%;
        letter-spacing: -0.04em;
      }

      .sora-tpg-h3 {
        font-family: Sora;
        font-size: 24px;
        font-weight: 400;
        line-height: 130%;
        letter-spacing: -0.02em;
      }

      .sora-tpg-h4 {
        font-family: Sora;
        font-size: 18px;
        font-weight: 400;
        line-height: 150%;
        letter-spacing: -0.02em;
      }

      .sora-tpg-h4-bold {
        font-family: Sora;
        font-size: 18px;
        font-weight: bold;
        line-height: 150%;
        letter-spacing: 0;
      }

      .sora-tpg-h5 {
        font-family: Sora;
        font-size: 16px;
        font-weight: bold;
        line-height: 150%;
        letter-spacing: 0.01em;
      }

      .sora-tpg-h6 {
        font-family: Sora;
        font-size: 14px;
        font-weight: bold;
        line-height: 150%;
        letter-spacing: 0;
      }

      .sora-tpg-h7 {
        font-family: Sora;
        font-size: 12px;
        font-weight: bold;
        line-height: 150%;
        letter-spacing: 0;
      }

      .sora-tpg-ch1 {
        font-family: Sora;
        font-size: 14px;
        font-weight: bold;
        line-height: 130%;
        letter-spacing: 0.01em;
        text-transform: uppercase;
      }

      .sora-tpg-ch2 {
        font-family: Sora;
        font-size: 12px;
        font-weight: bold;
        line-height: 130%;
        letter-spacing: 0.03em;
        text-transform: uppercase;
      }

      .sora-tpg-ch3 {
        font-family: Sora;
        font-size: 10px;
        font-weight: bold;
        line-height: 140%;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .sora-tpg-p1 {
        font-family: Sora;
        font-size: 16px;
        font-weight: 400;
        line-height: 170%;
        letter-spacing: 0;
      }

      .sora-tpg-p2 {
        font-family: Sora;
        font-size: 14px;
        font-weight: 600;
        line-height: 180%;
        letter-spacing: 0;
      }

      .sora-tpg-p3 {
        font-family: Sora;
        font-size: 14px;
        font-weight: 400;
        line-height: 180%;
        letter-spacing: 0;
      }

      .sora-tpg-p4 {
        font-family: Sora;
        font-size: 12px;
        font-weight: 400;
        line-height: 180%;
        letter-spacing: 0;
      }

      .sora-tpg-p5 {
        font-family: Sora;
        font-size: 10px;
        font-weight: 400;
        line-height: 160%;
        letter-spacing: 0;
      }

      .sora-tpg-s1 {
        font-family: Sora;
        font-size: 15px;
        font-weight: 400;
        line-height: 16px;
        letter-spacing: 0;
      }"
    `);
  });
});

describe('Utils', () => {
  test('full tokens tree evaluation - ok', () => {
    expect(
      compileInline(`
        @use 'v_util' as util;

        $src: (
          'sys.color.primary': '--scp',
          'sys.color.secondary': '--scs',
        );

        $values: (
          'sys.color.primary': red,
          'sys.color.secondary': blue
        );
        
        :root {
          @include util.eval-tokens($src, $values)
        }
      `)
    ).toMatchInlineSnapshot(`
      ":root {
        --scp: red;
        --scs: blue;
      }"
    `);
  });

  test('full tokens tree evaluation - error if there are excessive tokens', () => {
    expect(() =>
      compileInline(`
        @use 'v_util' as util;

        $src: (
          'sys.color.primary': '--scp',
          'sys.color.secondary': '--scs',
        );

        $values: (
          'sys.color.primary': red,
          'sys.color.secondary': blue,
          'sys.color.tertiary': green
        );
        
        :root {
          @include util.eval-tokens($src, $values)
        }
      `)
    ).toThrow(/excessive/);
  });

  test('partial tokens tree evaluation - ok', () => {
    expect(
      compileInline(`
        @use 'v_util' as util;

        $src: (
          'sys.color.primary': '--scp',
          'sys.color.secondary': '--scs',
        );

        $values: (
          'sys.color.secondary': blue
        );
        
        :root {
          @include util.eval-tokens($src, $values, true)
        }
      `)
    ).toMatchInlineSnapshot(`
      ":root {
        --scs: blue;
      }"
    `);
  });

  test('partial tokens tree evaluation - fails if there are excessive tokens', () => {
    expect(() =>
      compileInline(`
        @use 'v_util' as util;

        $src: (
          'sys.color.primary': '--scp',
          'sys.color.secondary': '--scs',
        );

        $values: (
          'sys.color.tertiary': green
        );
        
        :root {
          @include util.eval-tokens($src, $values, true)
        }
    `)
    ).toThrow(/excessive/);
  });

  describe('lists-diff', () => {
    test('works correct if there are equal elements on 0 index', () => {
      expect(
        compileInline(`
          @use 'v_util' as util;
          body {
            color: util.lists-diff(red blue, red green);
          }
      `)
      ).toMatchInlineSnapshot(`
        "body {
          color: blue;
        }"
      `);
    });
  });
});
