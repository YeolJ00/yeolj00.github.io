---
title: "iColoriT: Towards Propagating Local Hint to the Right Region in Interactive Colorization by Leveraging Vision Transformer"
collection: publications
permalink: /publication/2023-01-03-WACV-icolorit
date: 2023-01-03
venue: 'WACV'
paperurl: 'https://arxiv.org/abs/2207.06831'
authors: 'Jooyeol Yun*, Sanghyeon Lee*, Minho Park*, Jaegul Choo'
teaser: '/images/teaser_icolorit.gif'
---

Point-interactive image colorization aims to colorize grayscale images when a user provides the colors for specific locations. It is essential for point-interactive colorization methods to appropriately propagate user-provided colors (i.e., user hints) in the entire image to obtain a reasonably colorized image with minimal user effort. However, existing approaches often produce partially colorized results due to the inefficient design of stacking convolutional layers to propagate hints to distant relevant regions. To address this problem, we present iColoriT, a novel point-interactive colorization Vision Transformer capable of propagating user hints to relevant regions, leveraging the global receptive field of Transformers. The self-attention mechanism of Transformers enables iColoriT to selectively colorize relevant regions with only a few local hints. Our approach colorizes images in real-time by utilizing pixel shuffling, an efficient upsampling technique that replaces the decoder architecture. Also, in order to mitigate the artifacts caused by pixel shuffling with large upsampling ratios, we present the local stabilizing layer. Extensive quantitative and qualitative results demonstrate that our approach highly outperforms existing methods for point-interactive colorization, producing accurately colorized images with a user's minimal effort.

[Paper](https://openaccess.thecvf.com/content/WACV2023/html/Yun_iColoriT_Towards_Propagating_Local_Hints_to_the_Right_Region_in_WACV_2023_paper.html)

[Project Page](https://pmh9960.github.io/research/iColoriT/)

```
@InProceedings{Yun_2023_WACV,
    author    = {Yun, Jooyeol and Lee, Sanghyeon and Park, Minho and Choo, Jaegul},
    title     = {iColoriT: Towards Propagating Local Hints to the Right Region in Interactive Colorization by Leveraging Vision Transformer},
    booktitle = {Proceedings of the IEEE/CVF Winter Conference on Applications of Computer Vision (WACV)},
    month     = {January},
    year      = {2023},
    pages     = {1787-1796}
}

```