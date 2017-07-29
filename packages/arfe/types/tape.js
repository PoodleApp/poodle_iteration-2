declare module "tape" {
  
  declare type Test = (descr: string, callback: TestCallback) => void

  declare type TestCallback = (_: Context) => mixed

  declare type Context = {
    equal(actual: mixed, expected: mixed, msg?: string): void,
    ok: 
      & (<T>(val: T, msg?: string) => void)
      & ((val: null | void, msg?: string) => void),
    plan(assertionCount: number): void,
    test: Test,
  }

  declare export default function test(descr: string, callback: TestCallback): void
}
