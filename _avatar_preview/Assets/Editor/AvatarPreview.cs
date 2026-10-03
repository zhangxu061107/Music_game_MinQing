using System.IO;
using UnityEditor;
using UnityEngine;

public static class AvatarPreview
{
    public static void Render()
    {
        const string assetPath = "Assets/Models/069_Kyle.fbx";
        var source = AssetDatabase.LoadAssetAtPath<GameObject>(assetPath);
        if (source == null)
        {
            Debug.LogError("Avatar model was not imported: " + assetPath);
            EditorApplication.Exit(2);
            return;
        }

        var instance = Object.Instantiate(source);
        instance.transform.rotation = Quaternion.Euler(0f, 180f, 0f);
        var renderers = instance.GetComponentsInChildren<Renderer>(true);
        var texture = AssetDatabase.LoadAssetAtPath<Texture2D>("Assets/Models/100Avatars_069_Kyle.png");
        var shader = Shader.Find("Standard");
        if (texture != null && shader != null)
        {
            var previewMaterial = new Material(shader) { mainTexture = texture };
            foreach (var renderer in renderers)
            {
                var materials = renderer.sharedMaterials;
                for (int i = 0; i < materials.Length; i++) materials[i] = previewMaterial;
                renderer.sharedMaterials = materials;
            }
        }
        var bounds = new Bounds(instance.transform.position, Vector3.one);
        if (renderers.Length > 0)
        {
            bounds = renderers[0].bounds;
            foreach (var renderer in renderers) bounds.Encapsulate(renderer.bounds);
        }

        var preview = new PreviewRenderUtility();
        preview.AddSingleGO(instance);
        preview.cameraFieldOfView = 28f;
        preview.camera.clearFlags = CameraClearFlags.SolidColor;
        preview.camera.backgroundColor = new Color(0.035f, 0.055f, 0.075f, 1f);
        float radius = Mathf.Max(0.5f, bounds.extents.magnitude);
        Vector3 target = bounds.center + Vector3.up * bounds.extents.y * 0.05f;
        preview.camera.transform.position = target + new Vector3(0.25f, 0.12f, -radius * 3.3f);
        preview.camera.transform.LookAt(target);
        preview.camera.nearClipPlane = 0.01f;
        preview.camera.farClipPlane = radius * 10f;
        preview.lights[0].intensity = 1.4f;
        preview.lights[0].transform.rotation = Quaternion.Euler(40f, 35f, 0f);
        preview.lights[1].intensity = 1.0f;

        preview.BeginStaticPreview(new Rect(0f, 0f, 640f, 800f));
        preview.camera.Render();
        Texture2D result = preview.EndStaticPreview();
        string output = Path.GetFullPath("AvatarPreview_Kyle.png");
        File.WriteAllBytes(output, result.EncodeToPNG());
        Object.DestroyImmediate(result);
        preview.Cleanup();
        Debug.Log("Avatar preview written to " + output);
    }
}
