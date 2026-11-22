from typing import List, Dict
from app.schemas.voice import VoiceOption

# Verified Neural Voices Catalog
VOICE_CATALOG: Dict[str, List[VoiceOption]] = {
    "hi": [
        VoiceOption(
            voice_id="hi-IN-SwaraNeural",
            name="Swara (Hindi)",
            provider="edge_tts",
            language_code="hi",
            gender="female",
            description="Clear, expressive Hindi female voice with natural cadence",
            supports_cloning=False
        ),
        VoiceOption(
            voice_id="hi-IN-MadhurNeural",
            name="Madhur (Hindi)",
            provider="edge_tts",
            language_code="hi",
            gender="male",
            description="Warm, confident Hindi male voice suited for tutorials and podcasts",
            supports_cloning=False
        ),
        VoiceOption(
            voice_id="gemini-puck-hi",
            name="Puck (Gemini Multilingual)",
            provider="gemini_tts",
            language_code="hi",
            gender="male",
            description="Gemini expressive neural voice with multilingual adaptation",
            supports_cloning=False
        ),
        VoiceOption(
            voice_id="gemini-aoede-hi",
            name="Aoede (Gemini Multilingual)",
            provider="gemini_tts",
            language_code="hi",
            gender="female",
            description="Gemini smooth narrative female voice",
            supports_cloning=False
        ),
    ],
    "ur": [
        VoiceOption(
            voice_id="ur-PK-UzmaNeural",
            name="Uzma (Urdu - Pakistan)",
            provider="edge_tts",
            language_code="ur",
            gender="female",
            description="Fluent, gentle Pakistani Urdu female speaker",
            supports_cloning=False
        ),
        VoiceOption(
            voice_id="ur-PK-AsadNeural",
            name="Asad (Urdu - Pakistan)",
            provider="edge_tts",
            language_code="ur",
            gender="male",
            description="Deep, authoritative Pakistani Urdu male speaker",
            supports_cloning=False
        ),
        VoiceOption(
            voice_id="ur-IN-GulNeural",
            name="Gul (Urdu - India)",
            provider="edge_tts",
            language_code="ur",
            gender="female",
            description="Natural Indian Urdu speaker with conversational warmth",
            supports_cloning=False
        ),
        VoiceOption(
            voice_id="ur-IN-SalmanNeural",
            name="Salman (Urdu - India)",
            provider="edge_tts",
            language_code="ur",
            gender="male",
            description="Professional Indian Urdu broadcast presenter",
            supports_cloning=False
        ),
    ],
    "ar": [
        VoiceOption(
            voice_id="ar-SA-ZariyahNeural",
            name="Zariyah (Arabic - Saudi)",
            provider="edge_tts",
            language_code="ar",
            gender="female",
            description="Polished Modern Standard Arabic female voice",
            supports_cloning=False
        ),
        VoiceOption(
            voice_id="ar-SA-HamedNeural",
            name="Hamed (Arabic - Saudi)",
            provider="edge_tts",
            language_code="ar",
            gender="male",
            description="Resonant Modern Standard Arabic male narrator",
            supports_cloning=False
        ),
        VoiceOption(
            voice_id="ar-EG-SalmaNeural",
            name="Salma (Arabic - Egypt)",
            provider="edge_tts",
            language_code="ar",
            gender="female",
            description="Lively Egyptian Arabic female voice",
            supports_cloning=False
        ),
        VoiceOption(
            voice_id="ar-EG-ShakirNeural",
            name="Shakir (Arabic - Egypt)",
            provider="edge_tts",
            language_code="ar",
            gender="male",
            description="Friendly Egyptian Arabic male narrator",
            supports_cloning=False
        ),
    ],
    "en": [
        VoiceOption(
            voice_id="en-US-JennyNeural",
            name="Jenny (English - US)",
            provider="edge_tts",
            language_code="en",
            gender="female",
            description="Warm, highly natural American English female narrator",
            supports_cloning=False
        ),
        VoiceOption(
            voice_id="en-US-GuyNeural",
            name="Guy (English - US)",
            provider="edge_tts",
            language_code="en",
            gender="male",
            description="Professional American English male narrator",
            supports_cloning=False
        ),
        VoiceOption(
            voice_id="en-GB-SoniaNeural",
            name="Sonia (English - UK)",
            provider="edge_tts",
            language_code="en",
            gender="female",
            description="Crisp British English female speaker",
            supports_cloning=False
        ),
        VoiceOption(
            voice_id="en-GB-RyanNeural",
            name="Ryan (English - UK)",
            provider="edge_tts",
            language_code="en",
            gender="male",
            description="Engaging British English male speaker",
            supports_cloning=False
        ),
    ],
    "es": [
        VoiceOption(
            voice_id="es-ES-ElviraNeural",
            name="Elvira (Spanish - Spain)",
            provider="edge_tts",
            language_code="es",
            gender="female",
            description="European Spanish female narrator",
            supports_cloning=False
        ),
        VoiceOption(
            voice_id="es-ES-AlvaroNeural",
            name="Alvaro (Spanish - Spain)",
            provider="edge_tts",
            language_code="es",
            gender="male",
            description="European Spanish male speaker",
            supports_cloning=False
        ),
        VoiceOption(
            voice_id="es-MX-DaliaNeural",
            name="Dalia (Spanish - Mexico)",
            provider="edge_tts",
            language_code="es",
            gender="female",
            description="Latin American Spanish female voice",
            supports_cloning=False
        ),
        VoiceOption(
            voice_id="es-MX-JorgeNeural",
            name="Jorge (Spanish - Mexico)",
            provider="edge_tts",
            language_code="es",
            gender="male",
            description="Latin American Spanish male voice",
            supports_cloning=False
        ),
    ],
    "fr": [
        VoiceOption(
            voice_id="fr-FR-DeniseNeural",
            name="Denise (French - France)",
            provider="edge_tts",
            language_code="fr",
            gender="female",
            description="Graceful standard French female narrator",
            supports_cloning=False
        ),
        VoiceOption(
            voice_id="fr-FR-HenriNeural",
            name="Henri (French - France)",
            provider="edge_tts",
            language_code="fr",
            gender="male",
            description="Articulate French male narrator",
            supports_cloning=False
        ),
    ],
    "de": [
        VoiceOption(
            voice_id="de-DE-KatjaNeural",
            name="Katja (German - Germany)",
            provider="edge_tts",
            language_code="de",
            gender="female",
            description="Clear German female speaker",
            supports_cloning=False
        ),
        VoiceOption(
            voice_id="de-DE-KillianNeural",
            name="Killian (German - Germany)",
            provider="edge_tts",
            language_code="de",
            gender="male",
            description="Direct and confident German male speaker",
            supports_cloning=False
        ),
    ],
    "ja": [
        VoiceOption(
            voice_id="ja-JP-NanamiNeural",
            name="Nanami (Japanese)",
            provider="edge_tts",
            language_code="ja",
            gender="female",
            description="Bright, natural Japanese female voice",
            supports_cloning=False
        ),
        VoiceOption(
            voice_id="ja-JP-KeitaNeural",
            name="Keita (Japanese)",
            provider="edge_tts",
            language_code="ja",
            gender="male",
            description="Polite, calm Japanese male voice",
            supports_cloning=False
        ),
    ],
    "zh": [
        VoiceOption(
            voice_id="zh-CN-XiaoxiaoNeural",
            name="Xiaoxiao (Chinese - Mandarin)",
            provider="edge_tts",
            language_code="zh",
            gender="female",
            description="Expressive standard Mandarin female narrator",
            supports_cloning=False
        ),
        VoiceOption(
            voice_id="zh-CN-YunxiNeural",
            name="Yunxi (Chinese - Mandarin)",
            provider="edge_tts",
            language_code="zh",
            gender="male",
            description="Warm Mandarin male narrator",
            supports_cloning=False
        ),
    ],
    "pt": [
        VoiceOption(
            voice_id="pt-BR-FranciscaNeural",
            name="Francisca (Portuguese - Brazil)",
            provider="edge_tts",
            language_code="pt",
            gender="female",
            description="Brazilian Portuguese female voice",
            supports_cloning=False
        ),
        VoiceOption(
            voice_id="pt-BR-AntonioNeural",
            name="Antonio (Portuguese - Brazil)",
            provider="edge_tts",
            language_code="pt",
            gender="male",
            description="Brazilian Portuguese male voice",
            supports_cloning=False
        ),
    ],
    "ru": [
        VoiceOption(
            voice_id="ru-RU-SvetlanaNeural",
            name="Svetlana (Russian)",
            provider="edge_tts",
            language_code="ru",
            gender="female",
            description="Authentic Russian female voice",
            supports_cloning=False
        ),
        VoiceOption(
            voice_id="ru-RU-DmitryNeural",
            name="Dmitry (Russian)",
            provider="edge_tts",
            language_code="ru",
            gender="male",
            description="Resonant Russian male narrator",
            supports_cloning=False
        ),
    ],
    "it": [
        VoiceOption(
            voice_id="it-IT-ElsaNeural",
            name="Elsa (Italian)",
            provider="edge_tts",
            language_code="it",
            gender="female",
            description="Melodic Italian female voice",
            supports_cloning=False
        ),
        VoiceOption(
            voice_id="it-IT-DiegoNeural",
            name="Diego (Italian)",
            provider="edge_tts",
            language_code="it",
            gender="male",
            description="Clear Italian male voice",
            supports_cloning=False
        ),
    ],
    "bn": [
        VoiceOption(
            voice_id="bn-IN-TanishaaNeural",
            name="Tanishaa (Bengali - India)",
            provider="edge_tts",
            language_code="bn",
            gender="female",
            description="Natural Bengali female voice",
            supports_cloning=False
        ),
        VoiceOption(
            voice_id="bn-IN-BashkarNeural",
            name="Bashkar (Bengali - India)",
            provider="edge_tts",
            language_code="bn",
            gender="male",
            description="Warm Bengali male speaker",
            supports_cloning=False
        ),
    ],
    "ta": [
        VoiceOption(
            voice_id="ta-IN-PallaviNeural",
            name="Pallavi (Tamil - India)",
            provider="edge_tts",
            language_code="ta",
            gender="female",
            description="Clear Tamil female speaker",
            supports_cloning=False
        ),
        VoiceOption(
            voice_id="ta-IN-ValluvarNeural",
            name="Valluvar (Tamil - India)",
            provider="edge_tts",
            language_code="ta",
            gender="male",
            description="Articulate Tamil male speaker",
            supports_cloning=False
        ),
    ],
    "te": [
        VoiceOption(
            voice_id="te-IN-ShrutiNeural",
            name="Shruti (Telugu - India)",
            provider="edge_tts",
            language_code="te",
            gender="female",
            description="Fluent Telugu female voice",
            supports_cloning=False
        ),
        VoiceOption(
            voice_id="te-IN-MohanNeural",
            name="Mohan (Telugu - India)",
            provider="edge_tts",
            language_code="te",
            gender="male",
            description="Natural Telugu male voice",
            supports_cloning=False
        ),
    ],
    "tr": [
        VoiceOption(
            voice_id="tr-TR-EmelNeural",
            name="Emel (Turkish)",
            provider="edge_tts",
            language_code="tr",
            gender="female",
            description="Friendly Turkish female voice",
            supports_cloning=False
        ),
        VoiceOption(
            voice_id="tr-TR-AhmetNeural",
            name="Ahmet (Turkish)",
            provider="edge_tts",
            language_code="tr",
            gender="male",
            description="Clear Turkish male narrator",
            supports_cloning=False
        ),
    ],
    "ko": [
        VoiceOption(
            voice_id="ko-KR-SunHiNeural",
            name="SunHi (Korean)",
            provider="edge_tts",
            language_code="ko",
            gender="female",
            description="Natural Korean female speaker",
            supports_cloning=False
        ),
        VoiceOption(
            voice_id="ko-KR-InJoonNeural",
            name="InJoon (Korean)",
            provider="edge_tts",
            language_code="ko",
            gender="male",
            description="Authoritative Korean male speaker",
            supports_cloning=False
        ),
    ],
    "fil": [
        VoiceOption(
            voice_id="fil-PH-AngeloNeural",
            name="Angelo (Filipino - Philippines)",
            provider="edge_tts",
            language_code="fil",
            gender="male",
            description="Clear, expressive Filipino male voice suited for conversational dialogues and tutorials",
            supports_cloning=False
        ),
        VoiceOption(
            voice_id="fil-PH-BlessicaNeural",
            name="Blessica (Filipino - Philippines)",
            provider="edge_tts",
            language_code="fil",
            gender="female",
            description="Natural, warm Filipino female speaker with smooth cadence for character dubbing",
            supports_cloning=False
        ),
    ],
}


def get_voices_for_language(lang_code: str) -> List[VoiceOption]:
    normalized = lang_code.lower().strip()
    if normalized in ["tl", "tagalog", "filipino"]:
        normalized = "fil"
    return VOICE_CATALOG.get(normalized, VOICE_CATALOG.get("en", []))


def get_voice_by_id(voice_id: str) -> VoiceOption:
    for lang, voices in VOICE_CATALOG.items():
        for v in voices:
            if v.voice_id == voice_id:
                return v
    # Default fallback
    return VOICE_CATALOG["hi"][0]
