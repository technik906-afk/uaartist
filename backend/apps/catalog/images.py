"""
Обработка фото товаров при загрузке: владелец магазина не должен
думать о размере/формате файлов.

- поворот по EXIF (фото с телефона), затем EXIF отбрасывается
  (бонус: в метаданных бывают GPS-координаты);
- ужатие до MAX_DIMENSION по большей стороне;
- конвертация в JPEG (прозрачность ложится на белый фон);
- нечитаемый файл (в т.ч. HEIC без кодека) → понятная ValidationError.
"""

import io
from pathlib import PurePosixPath

from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError

MAX_DIMENSION = 2000
JPEG_QUALITY = 85


def process_product_image(field_file) -> tuple[str, ContentFile]:
    """Возвращает (имя_файла.jpg, обработанное содержимое)."""
    try:
        image = Image.open(field_file)
        image.load()
    except (UnidentifiedImageError, OSError) as exc:
        raise ValidationError(
            "Не удалось прочитать файл изображения. "
            "Используйте JPEG или PNG (HEIC с iPhone нужно конвертировать)."
        ) from exc

    image = ImageOps.exif_transpose(image)

    # Прозрачность (PNG/WebP) — на белый фон
    if image.mode in ("RGBA", "LA", "P"):
        rgba = image.convert("RGBA")
        background = Image.new("RGB", rgba.size, (255, 255, 255))
        background.paste(rgba, mask=rgba.split()[-1])
        image = background
    elif image.mode != "RGB":
        image = image.convert("RGB")

    image.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.LANCZOS)

    buffer = io.BytesIO()
    image.save(buffer, "JPEG", quality=JPEG_QUALITY, optimize=True)

    new_name = PurePosixPath(field_file.name or "photo").stem + ".jpg"
    return new_name, ContentFile(buffer.getvalue())
