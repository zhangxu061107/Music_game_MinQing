using UnityEngine;
using UnityEngine.SceneManagement;

namespace MeixiEcho
{
    public static class MeixiEchoBootstrap
    {
        [RuntimeInitializeOnLoadMethod(RuntimeInitializeLoadType.BeforeSceneLoad)]
        private static void Register()
        {
            SceneManager.sceneLoaded -= OnSceneLoaded;
            SceneManager.sceneLoaded += OnSceneLoaded;
        }

        private static void OnSceneLoaded(Scene scene, LoadSceneMode mode)
        {
            if (Object.FindAnyObjectByType<MeixiGame3D>() != null)
            {
                return;
            }

            var root = new GameObject("梅溪回响_3DGameRoot");
            root.AddComponent<MeixiGame3D>();
        }
    }
}
