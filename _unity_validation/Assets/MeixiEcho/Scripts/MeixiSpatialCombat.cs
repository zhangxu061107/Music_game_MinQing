using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;

namespace MeixiEcho
{
    /// <summary>贴地追踪玩家的红色攻击区：横扫/音符使用圆形，突刺使用矩形走廊。</summary>
    public sealed class TrackingAttackTelegraph3D : MonoBehaviour
    {
        private static readonly List<TrackingAttackTelegraph3D> ActiveTelegraphs = new();
        private Transform target;
        private Transform source;
        private Transform fill;
        private LineRenderer border;
        private Material fillMaterial;
        private float duration;
        private float age;
        private int attackType;
        private Vector3 trackedPosition;
        private Vector3 baseFillScale;
        private bool locked;

        public static void Create(Transform player, Transform enemy, int type, float lifetime)
        {
            if (player == null) return;
            var root = new GameObject(type == 1 ? "红色追踪矩形" : "红色追踪锁定圈");
            var effect = root.AddComponent<TrackingAttackTelegraph3D>();
            effect.Build(player, enemy, type, lifetime);
        }

        public static void LockAllAt(Vector3 worldPosition)
        {
            for (int i = ActiveTelegraphs.Count - 1; i >= 0; i--)
            {
                TrackingAttackTelegraph3D telegraph = ActiveTelegraphs[i];
                if (telegraph == null)
                {
                    ActiveTelegraphs.RemoveAt(i);
                    continue;
                }
                worldPosition.y = 0.055f;
                telegraph.trackedPosition = worldPosition;
                telegraph.locked = true;
            }
        }

        private void Build(Transform player, Transform enemy, int type, float lifetime)
        {
            target = player;
            source = enemy;
            attackType = type;
            duration = Mathf.Max(0.32f, lifetime);
            trackedPosition = player.position;
            ActiveTelegraphs.Add(this);

            Texture2D texture = Resources.Load<Texture2D>("Textures/Generated/MeixiBeatSigil");
            Shader shader = Shader.Find("Universal Render Pipeline/Unlit") ?? Shader.Find("Sprites/Default");
            fillMaterial = CreateTransparentMaterial(shader, texture, new Color(1f, 0.045f, 0.035f, 0.34f));

            var fillObject = GameObject.CreatePrimitive(PrimitiveType.Quad);
            fillObject.name = "追踪危险区填充";
            fillObject.transform.SetParent(transform, false);
            fillObject.transform.localPosition = Vector3.up * 0.018f;
            fillObject.transform.localRotation = Quaternion.Euler(90f, 0f, 0f);
            Destroy(fillObject.GetComponent<Collider>());
            fillObject.GetComponent<Renderer>().material = fillMaterial;
            fill = fillObject.transform;

            border = gameObject.AddComponent<LineRenderer>();
            border.useWorldSpace = false;
            border.loop = true;
            border.widthMultiplier = 0.085f;
            border.material = CreateTransparentMaterial(shader, null, new Color(1f, 0.03f, 0.02f, 0.98f));
            border.startColor = new Color(1f, 0.04f, 0.03f, 0.98f);
            border.endColor = new Color(1f, 0.32f, 0.10f, 0.84f);

            if (attackType == 1)
            {
                fill.localScale = new Vector3(2.0f, 6.6f, 1f);
                border.positionCount = 4;
                border.SetPosition(0, new Vector3(-1.0f, 0.03f, -3.3f));
                border.SetPosition(1, new Vector3(-1.0f, 0.03f, 3.3f));
                border.SetPosition(2, new Vector3(1.0f, 0.03f, 3.3f));
                border.SetPosition(3, new Vector3(1.0f, 0.03f, -3.3f));
            }
            else
            {
                float radius = attackType == 2 ? 1.65f : 2.35f;
                fill.localScale = Vector3.one * radius * 2f;
                border.positionCount = 56;
                for (int i = 0; i < border.positionCount; i++)
                {
                    float angle = i / (float)border.positionCount * Mathf.PI * 2f;
                    float jaggedRadius = radius * (1f + Mathf.Sin(angle * 8f) * 0.035f);
                    border.SetPosition(i, new Vector3(Mathf.Cos(angle) * jaggedRadius, 0.03f, Mathf.Sin(angle) * jaggedRadius));
                }
            }
            baseFillScale = fill.localScale;
            UpdateTransform(true);
        }

        private void OnDestroy()
        {
            ActiveTelegraphs.Remove(this);
        }

        private void Update()
        {
            age += Time.deltaTime;
            float t = Mathf.Clamp01(age / duration);
            if (!locked && t >= 0.82f) locked = true;
            UpdateTransform(false);

            float pulse = 1f + Mathf.Sin(Time.unscaledTime * Mathf.Lerp(13f, 34f, t)) * Mathf.Lerp(0.035f, 0.10f, t);
            if (fill != null) fill.localScale = baseFillScale * pulse;
            transform.localScale = Vector3.one * Mathf.Lerp(1.08f, 0.94f, t);
            border.widthMultiplier = Mathf.Lerp(0.07f, 0.18f, t);
            Color borderColor = Color.Lerp(new Color(1f, 0.06f, 0.04f, 0.72f), new Color(1f, 0.01f, 0.01f, 1f), t);
            border.startColor = borderColor;
            border.endColor = new Color(1f, 0.42f, 0.08f, borderColor.a);
            if (fillMaterial != null)
            {
                Color tint = new Color(1f, Mathf.Lerp(0.12f, 0.01f, t), 0.01f, Mathf.Lerp(0.24f, 0.64f, t));
                fillMaterial.color = tint;
                if (fillMaterial.HasProperty("_BaseColor")) fillMaterial.SetColor("_BaseColor", tint);
            }
            if (age >= duration) Destroy(gameObject);
        }

        private void UpdateTransform(bool immediate)
        {
            if (!locked && target != null)
            {
                Vector3 next = target.position;
                next.y = 0.055f;
                trackedPosition = immediate ? next : Vector3.Lerp(trackedPosition, next, 1f - Mathf.Exp(-24f * Time.deltaTime));
            }
            transform.position = trackedPosition;
            if (attackType == 1 && source != null)
            {
                Vector3 direction = trackedPosition - source.position;
                direction.y = 0f;
                if (direction.sqrMagnitude > 0.01f) transform.rotation = Quaternion.LookRotation(direction, Vector3.up);
            }
        }

        private static Material CreateTransparentMaterial(Shader shader, Texture texture, Color color)
        {
            var material = new Material(shader) { name = "红色追踪透明材质", color = color };
            if (texture != null)
            {
                material.mainTexture = texture;
                if (material.HasProperty("_BaseMap")) material.SetTexture("_BaseMap", texture);
            }
            if (material.HasProperty("_BaseColor")) material.SetColor("_BaseColor", color);
            if (material.HasProperty("_Surface")) material.SetFloat("_Surface", 1f);
            if (material.HasProperty("_SrcBlend")) material.SetFloat("_SrcBlend", (float)BlendMode.SrcAlpha);
            if (material.HasProperty("_DstBlend")) material.SetFloat("_DstBlend", (float)BlendMode.OneMinusSrcAlpha);
            if (material.HasProperty("_ZWrite")) material.SetFloat("_ZWrite", 0f);
            material.renderQueue = 3070;
            return material;
        }
    }

    /// <summary>K 键发射的三维音符波；飞行、轻微追踪并在接触溪灵时结算。</summary>
    public sealed class PlayerNoteWaveProjectile3D : MonoBehaviour
    {
        private MeixiGame3D game;
        private CreekRhythmEnemy3D target;
        private Vector3 direction;
        private bool onBeat;
        private float age;
        private Transform[] orbiters;

        public static void Create(MeixiGame3D owner, CreekRhythmEnemy3D enemy, Vector3 position, Vector3 travelDirection,
            Material cyan, Material gold, bool rhythmBoosted)
        {
            var root = new GameObject("玩家远程音符波");
            root.transform.position = position;
            root.transform.rotation = Quaternion.LookRotation(travelDirection.normalized, Vector3.up);

            var waveform = root.AddComponent<LineRenderer>();
            waveform.useWorldSpace = false;
            waveform.loop = false;
            waveform.positionCount = 30;
            waveform.widthMultiplier = rhythmBoosted ? 0.11f : 0.075f;
            waveform.material = new Material(cyan);
            waveform.startColor = rhythmBoosted ? Color.white : new Color(0.22f, 0.92f, 1f, 0.96f);
            waveform.endColor = new Color(1f, 0.52f, 0.16f, 0.70f);
            for (int i = 0; i < waveform.positionCount; i++)
            {
                float z = Mathf.Lerp(-0.75f, 0.75f, i / (waveform.positionCount - 1f));
                float envelope = 1f - Mathf.Abs(z) / 0.75f;
                waveform.SetPosition(i, new Vector3(Mathf.Sin(i * 1.55f) * 0.34f * envelope,
                    Mathf.Cos(i * 1.15f) * 0.18f * envelope, z));
            }

            var trail = root.AddComponent<TrailRenderer>();
            trail.time = 0.34f;
            trail.minVertexDistance = 0.04f;
            trail.startWidth = rhythmBoosted ? 0.42f : 0.30f;
            trail.endWidth = 0.015f;
            trail.material = new Material(cyan);
            trail.startColor = rhythmBoosted ? Color.white : new Color(0.18f, 0.92f, 1f, 0.76f);
            trail.endColor = new Color(0.10f, 0.42f, 1f, 0f);

            Transform[] motes = new Transform[3];
            for (int i = 0; i < motes.Length; i++)
            {
                var mote = GameObject.CreatePrimitive(PrimitiveType.Cube);
                mote.name = "音符波泛音";
                mote.transform.SetParent(root.transform, false);
                mote.transform.localScale = new Vector3(0.055f, 0.22f + i * 0.04f, 0.055f);
                mote.GetComponent<Renderer>().material = new Material(i == 1 ? gold : cyan);
                Destroy(mote.GetComponent<Collider>());
                motes[i] = mote.transform;
            }

            var projectile = root.AddComponent<PlayerNoteWaveProjectile3D>();
            projectile.game = owner;
            projectile.target = enemy;
            projectile.direction = travelDirection.normalized;
            projectile.onBeat = rhythmBoosted;
            projectile.orbiters = motes;
        }

        private void Update()
        {
            age += Time.deltaTime;
            if (target == null || game == null)
            {
                Destroy(gameObject);
                return;
            }

            Vector3 targetPoint = target.transform.position + Vector3.up * 0.85f;
            Vector3 desired = targetPoint - transform.position;
            if (desired.sqrMagnitude > 0.01f)
                direction = Vector3.Slerp(direction, desired.normalized, 1f - Mathf.Exp(-4.8f * Time.deltaTime));
            transform.position += direction * (onBeat ? 12.6f : 10.8f) * Time.deltaTime;
            transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(direction, Vector3.up),
                1f - Mathf.Exp(-12f * Time.deltaTime));

            if (orbiters != null)
            {
                for (int i = 0; i < orbiters.Length; i++)
                {
                    if (orbiters[i] == null) continue;
                    float angle = Time.unscaledTime * (7f + i * 1.7f) + i * Mathf.PI * 2f / orbiters.Length;
                    orbiters[i].localPosition = new Vector3(Mathf.Cos(angle) * 0.38f, Mathf.Sin(angle) * 0.30f, (i - 1) * 0.18f);
                    orbiters[i].Rotate(80f * Time.deltaTime, 150f * Time.deltaTime, 45f * Time.deltaTime, Space.Self);
                }
            }

            if (Vector3.Distance(transform.position, targetPoint) <= 1.08f)
            {
                game.ResolvePlayerRangedHit(target, onBeat, targetPoint);
                Destroy(gameObject);
                return;
            }
            if (age >= 3.2f) Destroy(gameObject);
        }
    }
}
