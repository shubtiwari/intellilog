import { LanguageProvider } from "./types";
import { JavascriptProvider } from "./javascript";
import { PythonProvider } from "./python";
import { GoProvider } from "./go";
import { PhpProvider } from "./php";
import { DartProvider } from "./dart";
import { RubyProvider } from "./ruby";
import { RustProvider } from "./rust";

export class ProviderRegistry {
  private providers = new Map<string, LanguageProvider>();

  constructor() {
    this.registerProvider(new JavascriptProvider());
    this.registerProvider(new PythonProvider());
    this.registerProvider(new GoProvider());
    this.registerProvider(new PhpProvider());
    this.registerProvider(new DartProvider());
    this.registerProvider(new RubyProvider());
    this.registerProvider(new RustProvider());
  }

  private registerProvider(provider: LanguageProvider) {
    for (const lang of provider.supportedLanguages) {
      this.providers.set(lang, provider);
    }
  }

  public getProviderForLanguage(languageId: string): LanguageProvider | undefined {
    return this.providers.get(languageId);
  }
}

export const providerRegistry = new ProviderRegistry();
