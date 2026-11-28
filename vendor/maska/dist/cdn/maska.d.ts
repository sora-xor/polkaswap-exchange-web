export declare class Mask {
    readonly opts: MaskOptions;
    private readonly memo;
    constructor(defaults?: MaskOptions);
    masked(value: string | number): string;
    unmasked(value: string | number): string;
    isEager(): boolean;
    isReversed(): boolean;
    completed(value: string | number): boolean;
    private findMask;
    private escapeMask;
    private process;
}

export declare interface MaskaDetail {
    masked: string;
    unmasked: string;
    completed: boolean;
}

declare type MaskaTarget = string | NodeListOf<HTMLInputElement> | HTMLInputElement;

export declare class MaskInput {
    private options;
    readonly items: Map<HTMLInputElement, Mask>;
    private readonly eventAbortController;
    constructor(target: MaskaTarget, options?: MaskInputOptions);
    update(options?: MaskInputOptions): void;
    updateValue(input: HTMLInputElement): void;
    destroy(): void;
    private init;
    private getInputs;
    private getOptions;
    private readonly onInput;
    private fixCursor;
    private setValue;
    private processInput;
}

export declare interface MaskInputOptions extends MaskOptions {
    onMaska?: OnMaskaType | OnMaskaType[];
    preProcess?: (value: string) => string;
    postProcess?: (value: string) => string;
}

declare interface MaskNumber {
    locale?: string;
    fraction?: number;
    unsigned?: boolean;
}

export declare interface MaskOptions {
    mask?: MaskType;
    tokens?: MaskTokens;
    tokensReplace?: boolean;
    eager?: boolean;
    reversed?: boolean;
    number?: MaskNumber;
}

declare interface MaskToken {
    pattern: RegExp;
    multiple?: boolean;
    optional?: boolean;
    repeated?: boolean;
    transform?: (char: string) => string;
}

export declare type MaskTokens = Record<string, MaskToken>;

export declare type MaskType = string | string[] | ((input: string) => string) | null;

declare type OnMaskaType = (detail: MaskaDetail) => void;

export declare const tokens: MaskTokens;

export { }
