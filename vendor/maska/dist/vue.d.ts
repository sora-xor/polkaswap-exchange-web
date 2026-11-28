import { Directive } from 'vue';

declare interface MaskaDetail {
    masked: string;
    unmasked: string;
    completed: boolean;
}

declare type MaskaDirective = Directive<HTMLElement, MaskInputOptions | string | undefined>;

declare interface MaskInputOptions extends MaskOptions {
    onMaska?: OnMaskaType | OnMaskaType[];
    preProcess?: (value: string) => string;
    postProcess?: (value: string) => string;
}

declare interface MaskNumber {
    locale?: string;
    fraction?: number;
    unsigned?: boolean;
}

declare interface MaskOptions {
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

declare type MaskTokens = Record<string, MaskToken>;

declare type MaskType = string | string[] | ((input: string) => string) | null;

declare type OnMaskaType = (detail: MaskaDetail) => void;

export declare const vMaska: MaskaDirective;

export { }
