using UnityEngine;
using UnityEngine.InputSystem;

namespace MeixiEcho
{
    [RequireComponent(typeof(CharacterController))]
    public sealed class MeixiThirdPersonPlayer : MonoBehaviour
    {
        private const string AnimatorControllerResource = "Animations/LinMoCombat";
        private const string CharacterModelResource = "Models/Characters/LinMo";
        private CharacterController controller;
        private MeixiGame3D game;
        private Transform visual;
        private ThirdPersonOrbitCamera orbitCamera;
        private Animator animator;
        private ProceduralHumanoidFallback fallbackPose;
        private float verticalVelocity;
        private float dashTimer;
        private float dashCooldown;
        private float attackCooldown;
        private float actionLockTimer;
        private float meleeLungeTimer;
        private float meleeImpactTimer;
        private bool meleeAttackArmed;
        private bool meleeImpactResolved;
        private bool meleeLungeLogged;
        private float footstepTimer;
        private bool animationPreview;
        private float animationPreviewStarted;
        private bool previewLightTriggered;
        private bool previewHeavyTriggered;
        private Vector3 lastMove = Vector3.forward;
        private Vector3 dashDirection = Vector3.forward;
        private Vector3 meleeDirection = Vector3.forward;
        private Vector3 horizontalVelocity;
        private Vector3 horizontalSmoothVelocity;
        private bool wasDashing;
        private bool animatorReady;
        private RuntimeAnimatorController boundAnimatorController;
        private Avatar boundAvatar;
        private float nextAnimatorRefresh;
        private Vector3 visualBasePosition;
        private Quaternion visualBaseRotation;
        private readonly int speedHash = Animator.StringToHash("Speed");
        private readonly int groundedHash = Animator.StringToHash("Grounded");
        private readonly int lightHash = Animator.StringToHash("Light");
        private readonly int heavyHash = Animator.StringToHash("Heavy");
        private readonly int dodgeHash = Animator.StringToHash("Dodge");
        private readonly int hitHash = Animator.StringToHash("Hit");
        private readonly int victoryHash = Animator.StringToHash("Victory");

        public Vector3 Forward => lastMove.sqrMagnitude > 0.01f ? lastMove.normalized : transform.forward;
        public bool IsInvulnerable => dashTimer > 0.015f;

        public void Configure(MeixiGame3D owner, ThirdPersonOrbitCamera cameraRig, Transform model)
        {
            game = owner;
            orbitCamera = cameraRig;
            visual = model;
            visualBasePosition = visual != null ? visual.localPosition : Vector3.zero;
            visualBaseRotation = visual != null ? visual.localRotation : Quaternion.identity;
            controller = GetComponent<CharacterController>();
            animator = visual != null ? visual.GetComponentInChildren<Animator>() : null;
            fallbackPose = visual != null ? visual.GetComponent<ProceduralHumanoidFallback>() : null;
            RefreshAnimatorBinding(true);
        }

        private void Update()
        {
            if (Time.unscaledTime >= nextAnimatorRefresh)
            {
                nextAnimatorRefresh = Time.unscaledTime + (animatorReady ? 0.50f : 0.12f);
                RefreshAnimatorBinding(false);
            }
            if (game == null || controller == null) return;

            dashTimer -= Time.deltaTime;
            dashCooldown -= Time.deltaTime;
            attackCooldown -= Time.deltaTime;
            actionLockTimer -= Time.deltaTime;
            meleeLungeTimer -= Time.deltaTime;
            if (meleeAttackArmed && !meleeImpactResolved)
            {
                meleeImpactTimer -= Time.deltaTime;
                if (meleeImpactTimer <= 0f)
                {
                    meleeImpactResolved = true;
                    Vector3 toTarget = game.CombatTargetPosition - transform.position;
                    toTarget.y = 0f;
                    if (controller.enabled && toTarget.sqrMagnitude > 0.01f)
                    {
                        // 低帧率时也补足尚未完成的突进距离；CharacterController 会阻止穿过敌人与墙体。
                        float remainingAdvance = Mathf.Clamp(toTarget.magnitude - 2.30f, 0f, 2.25f);
                        controller.Move(toTarget.normalized * remainingAdvance);
                        transform.forward = toTarget.normalized;
                    }
                    Debug.Log($"[MeixiSpatial] Melee impact player={transform.position} target={game.CombatTargetPosition}");
                    game.ResolvePlayerMelee(transform.position + Vector3.up * 0.85f, transform.forward);
                }
            }

            if (animationPreview)
            {
                UpdateAnimationPreview();
                return;
            }

            if (!game.CanPlayerMove)
            {
                horizontalVelocity = Vector3.SmoothDamp(horizontalVelocity, Vector3.zero, ref horizontalSmoothVelocity, 0.08f, Mathf.Infinity, Time.deltaTime);
                if (controller.isGrounded) verticalVelocity = -1.6f;
                else verticalVelocity = Mathf.Max(verticalVelocity + Physics.gravity.y * 2.25f * Time.deltaTime, -24f);
                controller.Move(Vector3.up * verticalVelocity * Time.deltaTime);
                SetAnimatorFloat(speedHash, 0f);
                if (!animatorReady) fallbackPose?.SetLocomotion(0f, 0f);
                UpdateVisualMotion(0f, 0f);
                return;
            }

            var keyboard = Keyboard.current;
            if (keyboard == null)
            {
                horizontalVelocity = Vector3.SmoothDamp(horizontalVelocity, Vector3.zero, ref horizontalSmoothVelocity, 0.08f, Mathf.Infinity, Time.deltaTime);
                if (controller.isGrounded) verticalVelocity = -1.6f;
                else verticalVelocity = Mathf.Max(verticalVelocity + Physics.gravity.y * 2.25f * Time.deltaTime, -24f);
                controller.Move(Vector3.up * verticalVelocity * Time.deltaTime);
                return;
            }

            float x = 0f;
            float z = 0f;
            if (keyboard.aKey.isPressed || keyboard.leftArrowKey.isPressed) x -= 1f;
            if (keyboard.dKey.isPressed || keyboard.rightArrowKey.isPressed) x += 1f;
            if (keyboard.sKey.isPressed || keyboard.downArrowKey.isPressed) z -= 1f;
            if (keyboard.wKey.isPressed || keyboard.upArrowKey.isPressed) z += 1f;

            Vector3 input = Vector3.ClampMagnitude(new Vector3(x, 0f, z), 1f);
            Vector3 forward = orbitCamera != null ? orbitCamera.FlatForward : Vector3.forward;
            Vector3 right = orbitCamera != null ? orbitCamera.FlatRight : Vector3.right;
            Vector3 move = Vector3.ClampMagnitude(forward * input.z + right * input.x, 1f);
            if (actionLockTimer > 0f) move = Vector3.zero;

            if (move.sqrMagnitude > 0.02f)
            {
                lastMove = move;
                transform.forward = Vector3.Slerp(transform.forward, move, 1f - Mathf.Exp(-13f * Time.deltaTime));
                footstepTimer -= Time.deltaTime;
                if (controller.isGrounded && footstepTimer <= 0f)
                {
                    footstepTimer = dashTimer > 0f ? 0.14f : 0.34f;
                    game.SpawnFootstep(transform.position);
                }
            }

            if (controller.isGrounded)
            {
                verticalVelocity = -1.6f;
                if (keyboard.spaceKey.wasPressedThisFrame && !game.ChapterOneCombatActive)
                {
                    verticalVelocity = 8.4f;
                    game.PlayJumpSound();
                }
            }
            else
            {
                verticalVelocity += Physics.gravity.y * 2.25f * Time.deltaTime;
            }

            bool dodgePressed = game.ChapterOneCombatActive
                ? keyboard.spaceKey.wasPressedThisFrame
                : keyboard.leftShiftKey.wasPressedThisFrame || keyboard.rightShiftKey.wasPressedThisFrame || keyboard.qKey.wasPressedThisFrame;
            if (dodgePressed && dashCooldown <= 0f)
            {
                if (game.ChapterOneCombatActive)
                {
                    Vector3 origin = transform.position;
                    Vector3 preferred = move.sqrMagnitude > 0.05f ? move.normalized : Vector3.zero;
                    Vector3 destination = game.SelectBlinkDestination(origin, preferred);
                    Vector3 displacement = destination - origin;
                    controller.Move(displacement);
                    dashDirection = Vector3.zero;
                    lastMove = displacement.sqrMagnitude > 0.01f ? displacement.normalized : Forward;
                    dashTimer = 0.20f;
                    dashCooldown = 0.58f;
                    actionLockTimer = 0.24f;
                    horizontalVelocity = Vector3.zero;
                    horizontalSmoothVelocity = Vector3.zero;
                    SetAnimatorTrigger(dodgeHash);
                    if (!animatorReady) fallbackPose?.TriggerDodge();
                    game.ResolveBlinkDodge(origin, transform.position);
                }
                else
                {
                    dashDirection = move.sqrMagnitude > 0.05f ? move.normalized : Forward;
                    lastMove = dashDirection;
                    dashTimer = 0.34f;
                    dashCooldown = 0.62f;
                    actionLockTimer = 0.28f;
                    SetAnimatorTrigger(dodgeHash);
                    if (!animatorReady) fallbackPose?.TriggerDodge();
                    game.ShowToast("踏 音 · 闪 避", new Color(0.36f, 0.90f, 1f));
                    game.SpawnDashTrail(transform.position, dashDirection);
                }
            }

            bool dashing = dashTimer > 0f;
            Vector3 targetHorizontal = move * 5.2f;
            if (dashing)
            {
                horizontalVelocity = dashDirection * 12.8f;
                horizontalSmoothVelocity = Vector3.zero;
            }
            else if (meleeLungeTimer > 0f)
            {
                horizontalVelocity = meleeDirection * (meleeAttackArmed ? 10.8f : 8.5f);
                horizontalSmoothVelocity = Vector3.zero;
                if (!meleeLungeLogged)
                {
                    meleeLungeLogged = true;
                    Debug.Log($"[MeixiSpatial] Lunge start position={transform.position} direction={meleeDirection} controller={controller.enabled}");
                }
            }
            else
            {
                if (wasDashing) horizontalVelocity = targetHorizontal;
                float smoothTime = targetHorizontal.sqrMagnitude > 0.01f ? 0.075f : 0.11f;
                horizontalVelocity = Vector3.SmoothDamp(horizontalVelocity, targetHorizontal, ref horizontalSmoothVelocity, smoothTime, Mathf.Infinity, Time.deltaTime);
            }
            wasDashing = dashing;
            float movementAmount = Mathf.Clamp01(horizontalVelocity.magnitude / 5.2f);
            UpdateVisualMotion(movementAmount, x);
            SetAnimatorFloat(speedHash, dashing ? 1f : movementAmount * 0.62f);
            SetAnimatorBool(groundedHash, controller.isGrounded);
            if (!animatorReady) fallbackPose?.SetLocomotion(movementAmount, x);
            controller.Move((horizontalVelocity + Vector3.up * verticalVelocity) * Time.deltaTime);

            Mouse mouse = Mouse.current;
            bool lightStrike = keyboard.jKey.wasPressedThisFrame || (mouse != null && mouse.leftButton.wasPressedThisFrame);
            bool heavyStrike = keyboard.kKey.wasPressedThisFrame || (mouse != null && mouse.rightButton.wasPressedThisFrame);
            if (lightStrike && attackCooldown <= 0f)
            {
                if (game.ChapterOneCombatActive)
                {
                    meleeAttackArmed = game.TryStartMeleeLunge(transform.position, out meleeDirection);
                    meleeLungeLogged = false;
                    meleeImpactResolved = !meleeAttackArmed;
                    meleeImpactTimer = 0.20f;
                    meleeLungeTimer = meleeAttackArmed ? 0.25f : 0.18f;
                    if (meleeDirection.sqrMagnitude > 0.01f)
                    {
                        transform.forward = meleeDirection;
                        lastMove = transform.forward;
                    }
                    attackCooldown = 0.44f;
                    actionLockTimer = 0.30f;
                    if (meleeAttackArmed)
                    {
                        SetAnimatorTrigger(lightHash);
                        if (!animatorReady) fallbackPose?.TriggerLight();
                    }
                    return;
                }
                attackCooldown = 0.28f;
                actionLockTimer = 0.34f;
                SetAnimatorTrigger(lightHash);
                if (!animatorReady) fallbackPose?.TriggerLight();
                game.PerformSoundPulse(transform.position + Vector3.up * 0.9f, Forward, false);
            }
            else if (heavyStrike && attackCooldown <= 0f)
            {
                attackCooldown = 0.62f;
                actionLockTimer = 0.46f;
                if (game.ChapterOneCombatActive)
                {
                    Vector3 targetDirection = game.CombatTargetPosition - transform.position;
                    targetDirection.y = 0f;
                    if (targetDirection.sqrMagnitude > 0.01f)
                    {
                        transform.forward = targetDirection.normalized;
                        lastMove = transform.forward;
                    }
                    SetAnimatorTrigger(heavyHash);
                    if (!animatorReady) fallbackPose?.TriggerHeavy();
                    game.FirePlayerNoteWave(transform.position + Vector3.up * 1.05f + transform.forward * 0.72f, transform.forward);
                    return;
                }
                SetAnimatorTrigger(heavyHash);
                if (!animatorReady) fallbackPose?.TriggerHeavy();
                game.PerformSoundPulse(transform.position + Vector3.up * 0.9f, Forward, true);
            }

            if (transform.position.y < -6f) game.RespawnPlayer();
        }

        public void BeginAnimationPreview()
        {
            animationPreview = true;
            animationPreviewStarted = Time.time;
            previewLightTriggered = false;
            previewHeavyTriggered = false;
            verticalVelocity = -1.6f;
            transform.forward = new Vector3(0.72f, 0f, 0.69f).normalized;
        }

        private void UpdateAnimationPreview()
        {
            float elapsed = Time.time - animationPreviewStarted;
            bool grounded = controller.isGrounded;
            verticalVelocity = grounded ? -1.6f : Mathf.Max(verticalVelocity + Physics.gravity.y * 2.25f * Time.deltaTime, -24f);

            if (elapsed < 0.88f)
            {
                // 自动走两步，确保迈腿、屈膝、摆臂和重心起伏能被独立验收。
                Vector3 previewMove = transform.forward * 1.45f;
                lastMove = transform.forward;
                controller.Move((previewMove + Vector3.up * verticalVelocity) * Time.deltaTime);
                SetAnimatorFloat(speedHash, 0.58f);
                SetAnimatorBool(groundedHash, grounded);
                if (!animatorReady) fallbackPose?.SetLocomotion(0.92f, 0f);
                UpdateVisualMotion(0.92f, 0f);
                return;
            }

            controller.Move(Vector3.up * verticalVelocity * Time.deltaTime);
            SetAnimatorFloat(speedHash, 0f);
            SetAnimatorBool(groundedHash, grounded);
            if (!animatorReady) fallbackPose?.SetLocomotion(0f, 0f);
            UpdateVisualMotion(0f, 0f);

            if (!previewLightTriggered && elapsed >= 0.98f)
            {
                previewLightTriggered = true;
                SetAnimatorTrigger(lightHash);
                if (!animatorReady) fallbackPose?.TriggerLight();
            }

            if (!previewHeavyTriggered && elapsed >= 1.48f)
            {
                previewHeavyTriggered = true;
                SetAnimatorTrigger(heavyHash);
                if (!animatorReady) fallbackPose?.TriggerHeavy();
            }
        }

        private void UpdateVisualMotion(float movement, float sideInput)
        {
            if (visual == null) return;
            if (animator != null && animator.enabled && animator.runtimeAnimatorController != null)
            {
                visual.localPosition = Vector3.Lerp(visual.localPosition, visualBasePosition, 1f - Mathf.Exp(-18f * Time.unscaledDeltaTime));
                visual.localRotation = Quaternion.Slerp(visual.localRotation, visualBaseRotation, 1f - Mathf.Exp(-18f * Time.unscaledDeltaTime));
                return;
            }
            float amount = Mathf.Clamp01(movement);
            float bob = Mathf.Sin(Time.time * 10f) * 0.035f * amount;
            Vector3 targetPosition = visualBasePosition + Vector3.up * bob;
            visual.localPosition = Vector3.Lerp(visual.localPosition, targetPosition, 1f - Mathf.Exp(-16f * Time.unscaledDeltaTime));
            Quaternion targetRotation = Quaternion.Euler(0f, 0f, -sideInput * 2.4f * amount);
            visual.localRotation = Quaternion.Slerp(visual.localRotation, targetRotation, 1f - Mathf.Exp(-12f * Time.unscaledDeltaTime));
        }

        public void TriggerHitReaction(Vector3 source)
        {
            SetAnimatorTrigger(hitHash);
            if (!animatorReady) fallbackPose?.TriggerHit();
            Vector3 away = transform.position - source;
            away.y = 0f;
            if (controller != null && controller.enabled && away.sqrMagnitude > 0.01f) controller.Move(away.normalized * 0.22f);
        }

        public void TriggerVictory()
        {
            SetAnimatorTrigger(victoryHash);
        }

        public void TriggerFinalStrike(CombatBeatAction action)
        {
            actionLockTimer = 1.05f;
            horizontalVelocity = Vector3.zero;
            horizontalSmoothVelocity = Vector3.zero;
            Vector3 targetDirection = game.CombatTargetPosition - transform.position;
            targetDirection.y = 0f;
            if (targetDirection.sqrMagnitude > 0.01f)
            {
                transform.forward = targetDirection.normalized;
                lastMove = transform.forward;
            }
            bool heavy = action == CombatBeatAction.AttackTwo;
            SetAnimatorTrigger(heavy ? heavyHash : lightHash);
            if (!animatorReady)
            {
                if (heavy) fallbackPose?.TriggerHeavy(); else fallbackPose?.TriggerLight();
            }
        }

        public void TriggerCombatActionForValidation(CombatBeatAction action)
        {
            Vector3 targetDirection = game.CombatTargetPosition - transform.position;
            targetDirection.y = 0f;
            if (targetDirection.sqrMagnitude > 0.01f)
            {
                transform.forward = targetDirection.normalized;
                lastMove = transform.forward;
            }

            if (action == CombatBeatAction.Dodge)
            {
                Vector3 origin = transform.position;
                Vector3 destination = game.SelectBlinkDestination(origin, -transform.forward);
                controller.Move(destination - origin);
                actionLockTimer = 0.24f;
                dashDirection = Vector3.zero;
                dashTimer = 0.20f;
                SetAnimatorTrigger(dodgeHash);
                if (!animatorReady) fallbackPose?.TriggerDodge();
                game.ResolveBlinkDodge(origin, transform.position);
                return;
            }

            if (action == CombatBeatAction.AttackTwo)
            {
                actionLockTimer = 0.46f;
                SetAnimatorTrigger(heavyHash);
                if (!animatorReady) fallbackPose?.TriggerHeavy();
                game.FirePlayerNoteWave(transform.position + Vector3.up * 1.05f + transform.forward * 0.72f, transform.forward);
                return;
            }

            meleeAttackArmed = game.TryStartMeleeLunge(transform.position, out meleeDirection);
            meleeLungeLogged = false;
            meleeImpactResolved = !meleeAttackArmed;
            meleeImpactTimer = 0.20f;
            meleeLungeTimer = meleeAttackArmed ? 0.25f : 0.18f;
            if (meleeAttackArmed)
            {
                SetAnimatorTrigger(lightHash);
                if (!animatorReady) fallbackPose?.TriggerLight();
            }
        }

        private void SetAnimatorTrigger(int hash)
        {
            if (animator != null && animator.enabled && animator.runtimeAnimatorController != null) animator.SetTrigger(hash);
        }

        private void SetAnimatorFloat(int hash, float value)
        {
            if (animator != null && animator.enabled && animator.runtimeAnimatorController != null) animator.SetFloat(hash, value, 0.10f, Time.deltaTime);
        }

        private void SetAnimatorBool(int hash, bool value)
        {
            if (animator != null && animator.enabled && animator.runtimeAnimatorController != null) animator.SetBool(hash, value);
        }

        private void RefreshAnimatorBinding(bool force)
        {
            if (visual == null) return;

            Animator candidate = visual.GetComponentInChildren<Animator>(true);
            if (candidate != null) animator = candidate;
            if (fallbackPose == null) fallbackPose = visual.GetComponent<ProceduralHumanoidFallback>();

            if (animator != null)
            {
                RuntimeAnimatorController controllerAsset = animator.runtimeAnimatorController;
                if (controllerAsset == null)
                {
                    controllerAsset = Resources.Load<RuntimeAnimatorController>(AnimatorControllerResource);
                    if (controllerAsset != null) animator.runtimeAnimatorController = controllerAsset;
                }

                if (animator.avatar == null || !animator.avatar.isValid)
                {
                    GameObject modelAsset = Resources.Load<GameObject>(CharacterModelResource);
                    Animator sourceAnimator = modelAsset != null ? modelAsset.GetComponent<Animator>() : null;
                    if (sourceAnimator != null && sourceAnimator.avatar != null && sourceAnimator.avatar.isValid)
                        animator.avatar = sourceAnimator.avatar;
                }

                animator.applyRootMotion = false;
                animator.cullingMode = AnimatorCullingMode.AlwaysAnimate;
                if (animator.runtimeAnimatorController != null && !animator.enabled) animator.enabled = true;
            }

            bool readyNow = animator != null && animator.enabled && animator.runtimeAnimatorController != null &&
                            animator.avatar != null && animator.avatar.isValid && animator.layerCount > 0;
            RuntimeAnimatorController currentController = readyNow ? animator.runtimeAnimatorController : null;
            Avatar currentAvatar = readyNow ? animator.avatar : null;
            bool bindingChanged = readyNow &&
                                  (currentController != boundAnimatorController || currentAvatar != boundAvatar);
            bool wasReady = animatorReady;

            // Animator and the procedural fallback both write humanoid bones, so exactly one may run.
            // Disable the fallback before Rebind so any temporary pose is cleared by the controller.
            if (fallbackPose != null) fallbackPose.enabled = !readyNow;
            animatorReady = readyNow;

            if (readyNow && (force || !wasReady || bindingChanged))
            {
                animator.Rebind();
                animator.Update(0f);
                animator.SetFloat(speedHash, 0f);
                animator.SetBool(groundedHash, controller == null || controller.isGrounded);
                Debug.Log($"[MeixiAnimation] Player animator bound on frame {Time.frameCount}; " +
                          $"controller={currentController.name}, avatar={currentAvatar.name}");
            }
            else if (!readyNow && wasReady)
            {
                Debug.LogWarning("[MeixiAnimation] Player animator asset changed during startup; using the procedural pose until automatic rebind succeeds.");
            }

            boundAnimatorController = currentController;
            boundAvatar = currentAvatar;
        }
    }

    public sealed class ProceduralHumanoidFallback : MonoBehaviour
    {
        private Transform hips;
        private Transform spine;
        private Transform leftArm;
        private Transform leftForearm;
        private Transform rightArm;
        private Transform rightForearm;
        private Transform leftHand;
        private Transform rightHand;
        private Transform leftLeg;
        private Transform rightLeg;
        private Transform leftLowerLeg;
        private Transform rightLowerLeg;
        private Transform leftFoot;
        private Transform rightFoot;
        private Quaternion hipsBase;
        private Quaternion spineBase;
        private Quaternion leftArmBase;
        private Quaternion leftForearmBase;
        private Quaternion rightArmBase;
        private Quaternion rightForearmBase;
        private Quaternion leftLegBase;
        private Quaternion rightLegBase;
        private Quaternion leftLowerLegBase;
        private Quaternion rightLowerLegBase;
        private Quaternion leftFootBase;
        private Quaternion rightFootBase;
        private Vector3 hipsBasePosition;
        private float locomotion;
        private float side;
        private float actionUntil;
        private float actionStarted;
        private float actionDuration;
        private int action;

        private void Awake()
        {
            hips = FindBone("Hips");
            spine = FindBone("Spine2", "Spine1", "Spine");
            leftArm = FindBone("LeftArm", "LeftUpperArm");
            leftForearm = FindBone("LeftForeArm", "LeftLowerArm");
            rightArm = FindBone("RightArm", "RightUpperArm");
            rightForearm = FindBone("RightForeArm", "RightLowerArm");
            leftHand = FindBone("LeftHand");
            rightHand = FindBone("RightHand");
            leftLeg = FindBone("LeftUpLeg", "LeftUpperLeg");
            rightLeg = FindBone("RightUpLeg", "RightUpperLeg");
            leftLowerLeg = FindBone("LeftLeg", "LeftLowerLeg");
            rightLowerLeg = FindBone("RightLeg", "RightLowerLeg");
            leftFoot = FindBone("LeftFoot");
            rightFoot = FindBone("RightFoot");

            PoseArm(leftArm, leftForearm, (Vector3.down + transform.forward * 0.10f).normalized);
            PoseArm(rightArm, rightForearm, (Vector3.down + transform.forward * 0.10f).normalized);
            hipsBase = Local(hips);
            spineBase = Local(spine);
            leftArmBase = Local(leftArm);
            leftForearmBase = Local(leftForearm);
            rightArmBase = Local(rightArm);
            rightForearmBase = Local(rightForearm);
            leftLegBase = Local(leftLeg);
            rightLegBase = Local(rightLeg);
            leftLowerLegBase = Local(leftLowerLeg);
            rightLowerLegBase = Local(rightLowerLeg);
            leftFootBase = Local(leftFoot);
            rightFootBase = Local(rightFoot);
            hipsBasePosition = hips != null ? hips.localPosition : Vector3.zero;
        }

        public void SetLocomotion(float amount, float lateral)
        {
            locomotion = Mathf.Clamp01(amount);
            side = lateral;
        }

        public void TriggerLight() => BeginAction(1, 0.58f);
        public void TriggerHeavy() => BeginAction(2, 0.72f);
        public void TriggerDodge() => BeginAction(3, 0.34f);
        public void TriggerHit() => BeginAction(4, 0.38f);

        private void BeginAction(int nextAction, float duration)
        {
            action = nextAction;
            actionStarted = Time.time;
            actionDuration = duration;
            actionUntil = actionStarted + duration;
        }

        private void LateUpdate()
        {
            float phase = Time.time * Mathf.Lerp(2.2f, 10.5f, locomotion);
            float stride = Mathf.Sin(phase);
            float swing = stride * 30f * locomotion;
            float breath = Mathf.Sin(Time.time * 1.9f) * 1.8f;
            float leftKnee = Mathf.Max(0f, stride) * 34f * locomotion;
            float rightKnee = Mathf.Max(0f, -stride) * 34f * locomotion;
            Quaternion hipsTarget = hipsBase * Quaternion.Euler(0f, side * locomotion * 2f, -side * locomotion * 4f);
            Quaternion spineTarget = spineBase * Quaternion.Euler(breath - locomotion * 5f, 0f, side * locomotion * 3f);
            Quaternion leftArmTarget = leftArmBase * Quaternion.Euler(swing, 0f, 0f);
            Quaternion rightArmTarget = rightArmBase * Quaternion.Euler(-swing, 0f, 0f);
            Quaternion leftForearmTarget = leftForearmBase * Quaternion.Euler(-Mathf.Abs(swing) * 0.48f, 0f, 0f);
            Quaternion rightForearmTarget = rightForearmBase * Quaternion.Euler(-Mathf.Abs(swing) * 0.48f, 0f, 0f);
            Quaternion leftLegTarget = leftLegBase * Quaternion.Euler(-swing * 0.88f, 0f, 0f);
            Quaternion rightLegTarget = rightLegBase * Quaternion.Euler(swing * 0.88f, 0f, 0f);
            Quaternion leftLowerLegTarget = leftLowerLegBase * Quaternion.Euler(leftKnee, 0f, 0f);
            Quaternion rightLowerLegTarget = rightLowerLegBase * Quaternion.Euler(rightKnee, 0f, 0f);
            Quaternion leftFootTarget = leftFootBase * Quaternion.Euler(-leftKnee * 0.34f, 0f, 0f);
            Quaternion rightFootTarget = rightFootBase * Quaternion.Euler(-rightKnee * 0.34f, 0f, 0f);

            float actionCurve = 0f;
            if (Time.time <= actionUntil)
            {
                float normalized = Mathf.Clamp01((Time.time - actionStarted) / Mathf.Max(0.01f, actionDuration));
                float curve = Mathf.Sin(Mathf.Clamp01(normalized) * Mathf.PI);
                actionCurve = curve;
                if (action == 1)
                {
                    rightArmTarget *= Quaternion.Euler(-92f * curve, 18f * curve, -26f * curve);
                    rightForearmTarget *= Quaternion.Euler(-58f * curve, 0f, 0f);
                    spineTarget *= Quaternion.Euler(0f, 28f * curve, 0f);
                }
                else if (action == 2)
                {
                    rightArmTarget *= Quaternion.Euler(-54f * curve, 16f, -28f * curve);
                    leftArmTarget *= Quaternion.Euler(-42f * curve, 0f, 26f * curve);
                    spineTarget *= Quaternion.Euler(14f * curve, -32f * curve, 0f);
                    rightLegTarget *= Quaternion.Euler(-76f * curve, 8f * curve, 0f);
                    rightLowerLegTarget *= Quaternion.Euler(58f * curve, 0f, 0f);
                    rightFootTarget *= Quaternion.Euler(-26f * curve, 0f, 0f);
                }
                else if (action == 3)
                {
                    hipsTarget *= Quaternion.Euler(22f * curve, 0f, 14f * curve);
                    spineTarget *= Quaternion.Euler(38f * curve, 0f, -22f * curve);
                    leftLegTarget *= Quaternion.Euler(-48f * curve, 0f, 0f);
                    rightLegTarget *= Quaternion.Euler(34f * curve, 0f, 0f);
                    leftLowerLegTarget *= Quaternion.Euler(52f * curve, 0f, 0f);
                    rightLowerLegTarget *= Quaternion.Euler(28f * curve, 0f, 0f);
                }
                else if (action == 4)
                {
                    spineTarget *= Quaternion.Euler(-26f * curve, 0f, 22f * curve);
                    leftArmTarget *= Quaternion.Euler(40f * curve, 0f, 35f * curve);
                    rightArmTarget *= Quaternion.Euler(32f * curve, 0f, -35f * curve);
                }
            }

            Apply(hips, hipsTarget);
            Apply(spine, spineTarget);
            Apply(leftArm, leftArmTarget);
            Apply(leftForearm, leftForearmTarget);
            Apply(rightArm, rightArmTarget);
            Apply(rightForearm, rightForearmTarget);
            Apply(leftLeg, leftLegTarget);
            Apply(rightLeg, rightLegTarget);
            Apply(leftLowerLeg, leftLowerLegTarget);
            Apply(rightLowerLeg, rightLowerLegTarget);
            Apply(leftFoot, leftFootTarget);
            Apply(rightFoot, rightFootTarget);

            // FBX 骨骼的局部轴并不统一。世界方向约束保证无论重定向结果如何，
            // 肩-肘-手与髋-膝-脚都会产生清晰的三维动作，而不是停留在固定姿势。
            float walkWeight = locomotion * 0.72f;
            if (walkWeight > 0.01f && actionCurve <= 0.01f)
            {
                Vector3 down = -transform.up;
                Vector3 forward = transform.forward;
                AimBone(leftArm, leftForearm, down + forward * (stride * 0.62f), walkWeight);
                AimBone(rightArm, rightForearm, down - forward * (stride * 0.62f), walkWeight);
                AimBone(leftForearm, leftHand, down + forward * 0.16f, walkWeight * 0.65f);
                AimBone(rightForearm, rightHand, down + forward * 0.16f, walkWeight * 0.65f);
                AimBone(leftLeg, leftLowerLeg, down + forward * (stride * 0.78f), walkWeight);
                AimBone(rightLeg, rightLowerLeg, down - forward * (stride * 0.78f), walkWeight);
                AimBone(leftLowerLeg, leftFoot, down - forward * (Mathf.Max(0f, stride) * 0.38f), walkWeight * 0.78f);
                AimBone(rightLowerLeg, rightFoot, down - forward * (Mathf.Max(0f, -stride) * 0.38f), walkWeight * 0.78f);
            }

            if (actionCurve > 0.01f)
            {
                Vector3 forward = transform.forward;
                Vector3 up = transform.up;
                Vector3 right = transform.right;
                if (action == 1)
                {
                    AimBone(rightArm, rightForearm, forward + up * 0.18f + right * 0.08f, actionCurve);
                    AimBone(rightForearm, rightHand, forward - up * 0.05f, actionCurve);
                    AimBone(leftArm, leftForearm, forward * 0.35f - up * 0.35f - right * 0.30f, actionCurve * 0.72f);
                }
                else if (action == 2)
                {
                    // 前踢：大腿抬起、膝部送前、脚尖略向下，同时双臂形成护架。
                    AimBone(rightLeg, rightLowerLeg, forward * 0.82f + up * 0.56f + right * 0.08f, actionCurve);
                    AimBone(rightLowerLeg, rightFoot, forward * 0.94f - up * 0.28f, actionCurve);
                    AimBone(rightArm, rightForearm, forward * 0.46f + up * 0.42f + right * 0.22f, actionCurve * 0.90f);
                    AimBone(leftArm, leftForearm, forward * 0.48f + up * 0.38f - right * 0.22f, actionCurve * 0.90f);
                    AimBone(rightForearm, rightHand, forward + up * 0.06f, actionCurve * 0.82f);
                    AimBone(leftForearm, leftHand, forward + up * 0.06f, actionCurve * 0.82f);
                }
            }
            if (hips != null)
            {
                float bob = Mathf.Abs(stride) * 0.018f * locomotion;
                hips.localPosition = Vector3.Lerp(hips.localPosition, hipsBasePosition + Vector3.up * bob, 1f - Mathf.Exp(-18f * Time.deltaTime));
            }
        }

        private Transform FindBone(params string[] endings)
        {
            foreach (Transform candidate in GetComponentsInChildren<Transform>(true))
            {
                foreach (string ending in endings)
                {
                    if (candidate.name.EndsWith(ending, System.StringComparison.OrdinalIgnoreCase)) return candidate;
                }
            }
            return null;
        }

        private static void PoseArm(Transform bone, Transform child, Vector3 direction)
        {
            if (bone == null || child == null) return;
            Vector3 current = child.position - bone.position;
            if (current.sqrMagnitude > 0.0001f) bone.rotation = Quaternion.FromToRotation(current.normalized, direction) * bone.rotation;
        }

        private static void AimBone(Transform bone, Transform child, Vector3 direction, float weight)
        {
            if (bone == null || child == null || direction.sqrMagnitude < 0.001f) return;
            Vector3 current = child.position - bone.position;
            if (current.sqrMagnitude < 0.0001f) return;
            Quaternion targetRotation = Quaternion.FromToRotation(current.normalized, direction.normalized) * bone.rotation;
            bone.rotation = Quaternion.Slerp(bone.rotation, targetRotation, Mathf.Clamp01(weight));
        }

        private static Quaternion Local(Transform bone) => bone != null ? bone.localRotation : Quaternion.identity;

        private static void Apply(Transform bone, Quaternion target)
        {
            if (bone != null) bone.localRotation = Quaternion.Slerp(bone.localRotation, target, 1f - Mathf.Exp(-18f * Time.deltaTime));
        }
    }

    public sealed class ThirdPersonOrbitCamera : MonoBehaviour
    {
        private Transform target;
        private Camera cameraComponent;
        private float yaw = 28f;
        private float pitch = 22f;
        private float distance = 7.6f;
        private Vector3 velocity;
        private bool rhythmFocus;
        private float rhythmYaw;
        private float rhythmPitch;
        private float rhythmDistance;
        private float storedYaw;
        private float storedPitch;
        private float storedDistance;
        private float focusPunch;
        private float cameraShake;
        private int rhythmChapter;
        private Transform combatTarget;
        private bool combatFocus;
        private bool finisherFocus;
        private bool animationPreviewFocus;
        private bool openingShot;
        private float openingStarted;
        private float openingDuration;
        private readonly RaycastHit[] obstructionHits = new RaycastHit[24];

        public Vector3 FlatForward
        {
            get
            {
                Vector3 value = Quaternion.Euler(0f, yaw, 0f) * Vector3.forward;
                value.y = 0f;
                return value.normalized;
            }
        }

        public Vector3 FlatRight => Quaternion.Euler(0f, 90f, 0f) * FlatForward;

        public void Configure(Transform followTarget)
        {
            target = followTarget;
            cameraComponent = GetComponent<Camera>();
        }

        public void BeginOpeningShot(float durationSeconds)
        {
            openingShot = true;
            openingStarted = Time.unscaledTime;
            openingDuration = Mathf.Max(0.1f, durationSeconds);
            if (cameraComponent != null) cameraComponent.fieldOfView = 48f;
        }

        public void BeginCombatFocus(Transform enemy)
        {
            if (!rhythmFocus)
            {
                storedYaw = yaw;
                storedPitch = pitch;
                storedDistance = distance;
            }
            combatTarget = enemy;
            combatFocus = enemy != null;
            finisherFocus = false;
            rhythmFocus = combatFocus;
            if (enemy != null)
            {
                Vector3 line = enemy.position - target.position;
                rhythmYaw = Mathf.Atan2(line.x, line.z) * Mathf.Rad2Deg + 48f;
                rhythmPitch = 16f;
                rhythmDistance = Mathf.Clamp(5.6f + line.magnitude * 0.42f, 6.2f, 8.8f);
            }
            focusPunch = 3.5f;
        }

        public void TriggerCombatImpact(bool perfect)
        {
            focusPunch = perfect ? 7.5f : 3.5f;
            cameraShake = perfect ? 0.34f : 0.16f;
        }

        public void EndCombatFocus()
        {
            combatFocus = false;
            finisherFocus = false;
            combatTarget = null;
            EndRhythmFocus();
        }

        public void BeginFinisherFocus(Transform enemy)
        {
            if (!rhythmFocus)
            {
                storedYaw = yaw;
                storedPitch = pitch;
                storedDistance = distance;
            }
            combatTarget = enemy;
            combatFocus = false;
            finisherFocus = enemy != null;
            rhythmFocus = true;
            if (enemy != null)
            {
                Vector3 line = enemy.position - target.position;
                float heading = Mathf.Atan2(line.x, line.z) * Mathf.Rad2Deg;
                rhythmYaw = heading + 78f;
                rhythmPitch = 11f;
                rhythmDistance = 4.35f;
            }
            focusPunch = 10f;
            cameraShake = 0.28f;
        }

        public void TriggerFinisherCut(int stage)
        {
            if (!finisherFocus || combatTarget == null) return;
            Vector3 line = combatTarget.position - target.position;
            float heading = Mathf.Atan2(line.x, line.z) * Mathf.Rad2Deg;
            rhythmYaw = heading + (stage == 0 ? 104f : -58f);
            rhythmPitch = stage == 0 ? 9f : 18f;
            rhythmDistance = stage == 0 ? 3.65f : 5.15f;
            focusPunch = stage == 0 ? 12f : 8f;
            cameraShake = stage == 0 ? 0.48f : 0.34f;
        }

        public void BeginRhythmFocus(int chapter)
        {
            if (!rhythmFocus)
            {
                storedYaw = yaw;
                storedPitch = pitch;
                storedDistance = distance;
            }
            rhythmFocus = true;
            rhythmChapter = chapter;
            rhythmYaw = yaw + (chapter % 2 == 0 ? 32f : -38f);
            rhythmPitch = chapter == 3 ? 13f : 17f;
            rhythmDistance = chapter == 3 ? 4.4f : 5.0f;
            focusPunch = 4f;
        }

        public void BeginAnimationPreviewFocus()
        {
            openingShot = false;
            rhythmFocus = false;
            combatFocus = false;
            combatTarget = null;
            animationPreviewFocus = true;
            velocity = Vector3.zero;
        }

        public void TriggerRhythmCut(int actionIndex, bool perfect)
        {
            float[] cuts = { -24f, 38f, 112f, -72f, 72f, 164f };
            float[] distances = { 4.6f, 3.7f, 6.1f, 4.3f, 4.3f, 5.5f };
            int index = Mathf.Abs(actionIndex) % cuts.Length;
            rhythmYaw = storedYaw + cuts[index] + rhythmChapter * 7f;
            rhythmPitch = actionIndex == 2 ? 25f : actionIndex == 1 ? 10f : 16f;
            rhythmDistance = distances[index];
            focusPunch = perfect ? 8f : 4.5f;
            cameraShake = actionIndex is 1 or 5 ? (perfect ? 0.42f : 0.26f) : 0.12f;
        }

        public void TriggerRhythmMiss()
        {
            cameraShake = 0.62f;
            focusPunch = -3f;
        }

        public void EndRhythmFocus()
        {
            rhythmFocus = false;
            finisherFocus = false;
            yaw = storedYaw;
            pitch = storedPitch;
            distance = storedDistance;
            focusPunch = 0f;
            cameraShake = 0f;
        }

        private void LateUpdate()
        {
            if (target == null) return;

            if (openingShot)
            {
                float t = Mathf.Clamp01((Time.unscaledTime - openingStarted) / openingDuration);
                float eased = t * t * (3f - 2f * t);
                Vector3 start = target.position + new Vector3(13.5f, 9.2f, 15.5f);
                Vector3 end = target.position + new Vector3(-6.2f, 4.2f, -7.2f);
                Vector3 lookStart = target.position + new Vector3(-6.8f, 0.8f, -5.8f);
                Vector3 lookEnd = target.position + Vector3.up * 1.35f;
                Vector3 desiredOpening = Vector3.Lerp(start, end, eased);
                Vector3 openingPivot = Vector3.Lerp(lookStart, lookEnd, eased);
                desiredOpening = ResolveCameraCollision(openingPivot, desiredOpening);
                transform.position = Vector3.Lerp(transform.position, desiredOpening, 1f - Mathf.Exp(-3.6f * Time.unscaledDeltaTime));
                transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(openingPivot - transform.position, Vector3.up), 1f - Mathf.Exp(-4.8f * Time.unscaledDeltaTime));
                if (cameraComponent != null) cameraComponent.fieldOfView = Mathf.Lerp(cameraComponent.fieldOfView, Mathf.Lerp(47f, 57f, eased), 1f - Mathf.Exp(-5f * Time.unscaledDeltaTime));
                if (t >= 1f)
                {
                    openingShot = false;
                    yaw = 28f;
                    pitch = 22f;
                    distance = 7.6f;
                }
                return;
            }

            if (animationPreviewFocus)
            {
                // 从角色正前侧拍摄全身，专门检查拳、腿与重心动作；该镜头不参与正式游戏。
                Vector3 previewPivot = target.position + Vector3.up * 1.02f;
                Vector3 previewDesired = previewPivot + target.right * 3.65f + target.forward * 1.35f + Vector3.up * 0.92f;
                float blend = 1f - Mathf.Exp(-9f * Time.unscaledDeltaTime);
                transform.position = Vector3.Lerp(transform.position, previewDesired, blend);
                transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(previewPivot - transform.position, Vector3.up), blend);
                if (cameraComponent != null) cameraComponent.fieldOfView = Mathf.Lerp(cameraComponent.fieldOfView, 44f, blend);
                return;
            }

            var mouse = Mouse.current;
            if (!rhythmFocus && mouse != null && Cursor.lockState == CursorLockMode.Locked)
            {
                Vector2 delta = mouse.delta.ReadValue();
                yaw += delta.x * 0.10f;
                pitch = Mathf.Clamp(pitch - delta.y * 0.085f, 10f, 48f);
                distance = Mathf.Clamp(distance - mouse.scroll.ReadValue().y * 0.004f, 4.8f, 10.5f);
            }
            else if (rhythmFocus)
            {
                float responsiveness = 1f - Mathf.Exp(-4.8f * Time.unscaledDeltaTime);
                if (combatFocus && combatTarget != null)
                {
                    Vector3 line = combatTarget.position - target.position;
                    float sideHeading = Mathf.Atan2(line.x, line.z) * Mathf.Rad2Deg + 48f;
                    rhythmYaw = sideHeading + Mathf.Sin(Time.unscaledTime * 0.55f) * 4.5f;
                    rhythmDistance = Mathf.Clamp(5.5f + line.magnitude * 0.48f, 6.2f, 9.0f);
                }
                yaw = Mathf.LerpAngle(yaw, rhythmYaw, responsiveness);
                pitch = Mathf.Lerp(pitch, rhythmPitch, responsiveness);
                distance = Mathf.Lerp(distance, rhythmDistance, responsiveness);
            }

            focusPunch = Mathf.MoveTowards(focusPunch, 0f, Time.unscaledDeltaTime * 16f);
            cameraShake = Mathf.MoveTowards(cameraShake, 0f, Time.unscaledDeltaTime * 1.9f);
            if (cameraComponent != null)
            {
                float targetFov = rhythmFocus ? (combatFocus ? 54f : 52f) - focusPunch : 60f;
                cameraComponent.fieldOfView = Mathf.Lerp(cameraComponent.fieldOfView, targetFov, 1f - Mathf.Exp(-9f * Time.unscaledDeltaTime));
            }

            Vector3 pivot = (combatFocus || finisherFocus) && combatTarget != null
                ? Vector3.Lerp(target.position, combatTarget.position, finisherFocus ? 0.56f : 0.48f) + Vector3.up * 1.18f
                : target.position + Vector3.up * (rhythmFocus ? 1.20f : 1.75f);
            Quaternion rotation = Quaternion.Euler(pitch, yaw, 0f);
            Vector3 desired = pivot - rotation * Vector3.forward * distance;
            if (cameraShake > 0f)
            {
                desired += transform.right * Mathf.Sin(Time.unscaledTime * 57f) * cameraShake;
                desired += transform.up * Mathf.Cos(Time.unscaledTime * 43f) * cameraShake * 0.55f;
            }
            desired = ResolveCameraCollision(pivot, desired);
            transform.position = Vector3.SmoothDamp(transform.position, desired, ref velocity, 0.075f);
            transform.rotation = Quaternion.LookRotation(pivot - transform.position, Vector3.up);
        }

        private Vector3 ResolveCameraCollision(Vector3 pivot, Vector3 desired)
        {
            Vector3 cast = desired - pivot;
            float distanceToCamera = cast.magnitude;
            if (distanceToCamera < 0.01f) return desired;
            int count = Physics.SphereCastNonAlloc(pivot, 0.27f, cast / distanceToCamera, obstructionHits, distanceToCamera, ~0, QueryTriggerInteraction.Ignore);
            float nearest = distanceToCamera;
            for (int i = 0; i < count; i++)
            {
                Collider collider = obstructionHits[i].collider;
                if (collider == null) continue;
                Transform hitTransform = collider.transform;
                if (hitTransform == target || hitTransform.IsChildOf(target)) continue;
                if (combatTarget != null && (hitTransform == combatTarget || hitTransform.IsChildOf(combatTarget))) continue;
                if (collider.bounds.max.y < pivot.y - 0.16f) continue;
                nearest = Mathf.Min(nearest, obstructionHits[i].distance);
            }
            return nearest < distanceToCamera ? pivot + cast.normalized * Mathf.Max(0.55f, nearest - 0.18f) : desired;
        }
    }
}
