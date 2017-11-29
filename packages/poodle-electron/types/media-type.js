declare class mediaType$MediaType {
  type: string;
  subtype: string;
  subtypeFacets: string[];
  suffix: ?string;
  parameters: { [key: string]: string };
  isValid(): boolean;
  hasSuffix(): boolean;
  isVendor(): boolean;
  isPersonal(): boolean;
  isExperimental(): boolean;
  asString(): string;
}

declare module 'media-type' {
  declare type MediaType = mediaType$MediaType
  declare function fromString(str: string): MediaType;
}
