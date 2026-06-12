"""Semilla del dominio de jerarquias: tipos, jerarquias base y code-lists."""

from __future__ import annotations

from sqlalchemy.orm import Session

from uniback.contrib.hierarchies.models import Hierarchy, HierarchyNode, HierarchyType

ht_cl_name = "Code List"
tm_hierarchy_types = {
    "45e91fea-6ca3-40c8-a798-98ca6a8e0e2a": ht_cl_name,
    "f3625ee6-99e1-4db9-82e4-adb6c1a01762": "Hierarchical Code List",
}

h_subjects_name = "Temas"
h_sources_name = "Fuentes"
h_crs_name = "CRS"
h_base_maps_name = "Mapas Base"
tm_hierarchies_fields = ((HierarchyType, "name", "id", "h_type_id"), "uuid", "name")
tm_hierarchies = [
    (ht_cl_name, "9975f4a0-a321-409a-bb2b-7afd05a60117", h_subjects_name),
    (ht_cl_name, "8267366d-97c7-47d8-83b5-68fe763c5e81", h_sources_name),
    (ht_cl_name, "7cdc80c7-739d-4787-8529-b52f83994930", h_crs_name),
    (ht_cl_name, "7ece7ead-4de9-436f-a12d-86350129e444", h_base_maps_name),
]

tm_code_list_fields = ((Hierarchy, "name", "id", "hierarchy_id"), "uuid", "name")
tm_code_list_subjects = [
    (h_subjects_name, "2d1d71be-2e7e-4c0a-8d4c-21d2bc5bdad6", "Altimetría y modelos digitales"),
    (h_subjects_name, "eb85c308-61e3-4be6-b2c4-4d86b46a62f8", "Ámbitos de Ordenación Específicos"),
    (h_subjects_name, "68ecc77c-bc78-4352-a407-ee7bb06c04d1", "Áreas de Especial Protección"),
    (h_subjects_name, "08bd7b77-a977-4447-962b-78c0796bc06a", "Cartografía Específica"),
    (h_subjects_name, "dd1cd206-a45c-43d4-95aa-a0f1ac3c5f96", "Catastro"),
    (h_subjects_name, "1247d2cd-dcd1-4238-b44f-ea816c97b084", "Clima"),
    (h_subjects_name, "cb6b0956-4511-42d9-a75b-3b45f094a786", "Coberturas físicas y biológicas"),
    (h_subjects_name, "fdef90ae-c9c1-4415-8bf8-19b31799beb5", "Datos Estadísticos"),
    (h_subjects_name, "343e8354-925f-4c8e-aefa-7834ff2c3cc6", "Edafología"),
    (h_subjects_name, "763a0def-dc78-4561-9f8d-042d09b36ff9", "Elementos hidrográficos"),
    (h_subjects_name, "c5832d73-ba79-46e0-9448-21d0c101927f", "Entidades de población"),
    (h_subjects_name, "efc017c3-45f8-4811-9262-bfb92efc3204", "Equipamientos y servicios"),
    (h_subjects_name, "3fa8c241-05e8-40a3-8f75-e193bfe69999", "Geocodificaciones"),
    (h_subjects_name, "a26d12d3-ead3-4681-95d6-c6fb0c6cbb10", "Infraestructuras y redes de transporte"),
    (h_subjects_name, "1bfd9a77-891d-4863-aa33-09c5976ee823", "Instalaciones agrarias y acuicultura"),
    (h_subjects_name, "57acf475-21d0-4270-a947-5b20ab299539", "Instalaciones Industriales"),
    (h_subjects_name, "f5c2afb6-27ff-4118-91a5-75e6a9541763", "Malla demográfica"),
    (h_subjects_name, "42a78b57-b610-4b66-af4d-ebf090666cba", "Nomenclator de Población"),
    (h_subjects_name, "86ee31c5-bb1a-4c88-af9c-298084920c19", "Ortofotos"),
    (h_subjects_name, "d57653c7-cf75-4333-8677-c58bdf9b0a93", "Otros sin asignación"),
    (h_subjects_name, "809b6d03-db8f-4543-bc4d-93a93dca1839", "Protección Territorial"),
    (h_subjects_name, "8d746d7f-2309-4389-92d1-54ae6015a78f", "Referencias Geográficas"),
    (h_subjects_name, "0afe9d50-7ce8-41ec-9ef2-55712258c43f", "Riesgos"),
    (h_subjects_name, "1497662c-e31a-418c-ae5e-e0eb8e98888e", "Salud y seguridad humana"),
    (h_subjects_name, "ffadcde3-60bf-43e5-9aec-1b54d89370c9", "Unidades Estadísticas"),
    (h_subjects_name, "b8e58143-fe0e-440a-995b-576d2e1e9d51", "Usos del Suelo")
]

tm_code_list_crs = [
    (h_crs_name, "9c534897-2fd6-4165-b161-c0317ff59718", "EPSG:4326"),
    (h_crs_name, "9cbb027f-e532-4d81-bb66-467a06008429", "EPSG:32628"),
]

tm_code_list_sources = [
    (h_sources_name, "d77abee2-17ff-4063-8b54-a8e35647a5f0", "Grafcan"),
    (h_sources_name, "d05c68e7-5674-4b10-8cea-7b9cb8f1b798", "ISTAC"),
    (h_sources_name, "b2be8a7a-67f2-4fd1-afee-cb89164767a9", "ITC"),
    (h_sources_name, "55e9958c-2f73-47c4-afa6-37bf23c683f9", "EUROSTAT"),
]

tm_code_list_base_maps = [
    (h_base_maps_name, "d77abee2-17ff-4063-8b54-a8e35647a5f0", "Grafcan OrtoExpress - https://idecan1.grafcan.es/ServicioWMS/OrtoExpress"),
    (h_base_maps_name, "071a22e8-1d90-4900-936a-0466880480d4", "Grafcan Mapa Topográfico Integrado - https://idecan2.grafcan.es/ServicioWMS/MTI"),
    (h_base_maps_name, "faec0128-c0e3-4c2c-bbb2-bd852430eed3", "Grafcan Ortofoto Urbana alta resolución - https://idecan1.grafcan.es/ServicioWMS/OrtoUrb"),
    (h_base_maps_name, "b4f90851-250e-425f-9a94-b677b593c842", "Grafcan Modelo LIDAR - https://idecan1.grafcan.es/ServicioWMS/MTL"),
    (h_base_maps_name, "d04fc218-8dea-4938-a4d0-49e3d8174715", "Grafcan Modelo Sombras - https://idecan2.grafcan.es/ServicioWMS/MDSombras"),
    (h_base_maps_name, "07c7512b-d7ce-4162-85c4-cda2503f290c", "Grafcan Alta Resolución - https://idecan2.grafcan.es/ServicioWMS/Gigapan")
]


def seed_hierarchies(db: Session) -> None:
    from uniback.persistence.seeding import load_table, load_table_extended

    load_table(db, HierarchyType, tm_hierarchy_types)
    load_table_extended(db, Hierarchy, tm_hierarchies_fields, tm_hierarchies)
    load_table_extended(db, HierarchyNode, tm_code_list_fields, tm_code_list_subjects)
    load_table_extended(db, HierarchyNode, tm_code_list_fields, tm_code_list_sources)
    load_table_extended(db, HierarchyNode, tm_code_list_fields, tm_code_list_crs)
    load_table_extended(db, HierarchyNode, tm_code_list_fields, tm_code_list_base_maps)
