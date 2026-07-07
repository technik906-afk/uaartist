"""Обработка фото при загрузке: ужатие, JPEG, прозрачность, плохие файлы."""

import io

import pytest
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image

from apps.catalog.models import Category, Product, ProductImage


def make_upload(width, height, mode="RGB", fmt="PNG", name="photo.png"):
    image = Image.new(
        mode, (width, height), (200, 150, 100, 128) if "A" in mode else (200, 150, 100)
    )
    buffer = io.BytesIO()
    image.save(buffer, fmt)
    return SimpleUploadedFile(name, buffer.getvalue(), content_type=f"image/{fmt.lower()}")


@pytest.fixture
def product(db):
    category = Category.objects.create(name="Косметички", slug="kosmetichki")
    return Product.objects.create(category=category, name="Товар", slug="tovar")


def saved_image(product):
    return Image.open(product.images.first().image)


class TestImageProcessing:
    def test_large_image_resized_to_2000(self, product):
        ProductImage.objects.create(product=product, image=make_upload(3200, 2400))
        img = saved_image(product)
        assert max(img.size) == 2000
        assert img.format == "JPEG"

    def test_small_image_not_upscaled(self, product):
        ProductImage.objects.create(product=product, image=make_upload(800, 600))
        img = saved_image(product)
        assert img.size == (800, 600)
        assert img.format == "JPEG"

    def test_png_transparency_flattened_to_jpeg(self, product):
        ProductImage.objects.create(
            product=product, image=make_upload(500, 500, mode="RGBA", fmt="PNG")
        )
        img = saved_image(product)
        assert img.format == "JPEG"
        assert img.mode == "RGB"

    def test_filename_becomes_jpg(self, product):
        pi = ProductImage.objects.create(
            product=product, image=make_upload(500, 500, name="IMG 1234.png")
        )
        assert pi.image.name.endswith(".jpg")

    def test_resave_does_not_reprocess(self, product):
        pi = ProductImage.objects.create(product=product, image=make_upload(500, 500))
        name_after_upload = pi.image.name
        pi.alt_text = "новый alt"
        pi.save()
        pi.refresh_from_db()
        assert pi.image.name == name_after_upload  # файл не трогали

    def test_unreadable_file_rejected(self, product):
        bad = SimpleUploadedFile("fake.jpg", b"this is not an image", content_type="image/jpeg")
        with pytest.raises(ValidationError, match="JPEG или PNG"):
            ProductImage.objects.create(product=product, image=bad)
